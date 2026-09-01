import Lean.Data.Json.Parser
import Lean.Data.Json.Printer
import Std.Tactic
import TheoremTerminal.Justification.Semantics

namespace TheoremTerminal.Justification.AIInteraction

open Lean
open TheoremTerminal.Justification

/-!
The structures in this file are a narrow JSON transfer boundary, not an
AI-specific epistemic model.  They project one already-finalized model-call
span into the ordinary opaque atoms, context, and certificate of the generic
justification checker.
-/

structure Reference where
  kind : String
  id : String
  revision : String
deriving BEq, Repr

structure Actor where
  kind : String
  id : String
deriving BEq, Repr

structure DocumentaryClaim where
  id : String
  displayName : String
  assertion : String
  description : String
  representationRefs : List Reference
  contentHash : String
deriving BEq, Repr

structure ModelProducedPayload where
  callId : String
  responseDigest : String
  startByte : Nat
  endByte : Nat
  representationId : String
  representationContentHash : String
deriving BEq, Repr

structure DocumentaryWarrantRequest where
  fixtureId : String
  profileId : String
  contextId : String
  admissionId : String
  admittedBy : Actor
  recordedAt : String
  checkedAt : String
  basisRefs : List Reference
  claim : DocumentaryClaim
  reasonVariable : String
  rationale : String
  scope : String
  derivationId : String
deriving BEq, Repr

def requestSchema : String :=
  "theorem-terminal.documentary-warrant-request"

def requestSchemaVersion : Nat := 1

def metadata : ProfileMetadata := {
  id := "theorem-terminal-j0-ai-documentary-v1"
  syntaxVersion := supportedSyntaxVersion
  ruleVersion := supportedRuleVersion
  checker := supportedChecker
  checkerVersion := supportedCheckerVersion
}

def profile : Profile := .j0 metadata

private def requireExactKeys (value : Json) (expected : List String)
    (path : String) : Except String Unit := do
  let object ← value.getObj?
  if object.size != expected.length || !expected.all object.contains then
    throw s!"{path} has wrong fields"

private def isBidiControl (value : UInt32) : Bool :=
  value == 0x061c || value == 0x200e || value == 0x200f ||
  (0x202a ≤ value && value ≤ 0x202e) ||
  (0x2066 ≤ value && value ≤ 0x2069)

private def safeString (value path : String) : Except String String := do
  if value.isEmpty then
    throw s!"{path} must be a non-empty string"
  if value.any fun character =>
      character.val < 0x20 ||
      (0x7f ≤ character.val && character.val ≤ 0x9f) ||
      isBidiControl character.val then
    throw s!"{path} contains an unsafe display-control character"
  pure value

private def stringField (value : Json) (field path : String) :
    Except String String := do
  safeString (← (← value.getObjVal? field).getStr?) s!"{path}.{field}"

private def isLowerHexDigit (character : Char) : Bool :=
  ('0' ≤ character && character ≤ '9') ||
  ('a' ≤ character && character ≤ 'f')

private def requireSha256 (value path : String) : Except String String := do
  if value.length != 64 || !value.all isLowerHexDigit then
    throw s!"{path} must be a lowercase SHA-256 digest"
  pure value

private def parseReference (value : Json) (path : String) :
    Except String Reference := do
  requireExactKeys value ["kind", "id", "revision"] path
  pure {
    kind := ← stringField value "kind" path
    id := ← stringField value "id" path
    revision := ← stringField value "revision" path
  }

private def parseReferences (value : Json) (path : String) :
    Except String (List Reference) := do
  let values ← value.getArr?
  values.toList.mapIdxM fun index item =>
    parseReference item s!"{path}[{index}]"

private def parseActor (value : Json) (path : String) : Except String Actor := do
  requireExactKeys value ["kind", "id"] path
  let kind ← stringField value "kind" path
  if kind != "person" && kind != "named_policy" then
    throw s!"{path}.kind must be person or named_policy"
  pure {
    kind
    id := ← stringField value "id" path
  }

private def parseClaim (value : Json) : Except String DocumentaryClaim := do
  requireExactKeys value
    ["id", "display_name", "assertion", "description",
      "representation_refs", "content_hash"] "request.claim"
  pure {
    id := ← stringField value "id" "request.claim"
    displayName := ← stringField value "display_name" "request.claim"
    assertion := ← stringField value "assertion" "request.claim"
    description := ← stringField value "description" "request.claim"
    representationRefs := ←
      parseReferences (← value.getObjVal? "representation_refs")
        "request.claim.representation_refs"
    contentHash := ← requireSha256
      (← stringField value "content_hash" "request.claim")
      "request.claim.content_hash"
  }

private def parseModelProducedPayload (assertion : String) :
    Except String ModelProducedPayload := do
  let payload ← Json.parse assertion
  if Json.compress payload != assertion then
    throw "request.claim.assertion must be compact canonical JSON"
  let values ← payload.getArr?
  if values.size != 7 then
    throw "request.claim.assertion must have seven elements"
  let tag ← (values[0]!).getStr?
  if tag != "model-produced-v1" then
    throw "request.claim.assertion has the wrong tag"
  let callId ← safeString (← (values[1]!).getStr?)
    "request.claim.assertion.call_id"
  let responseDigest ← requireSha256 (← (values[2]!).getStr?)
    "request.claim.assertion.response_digest"
  let startByte ← (values[3]!).getNat?
  let endByte ← (values[4]!).getNat?
  if endByte ≤ startByte then
    throw "request.claim.assertion span must be non-empty and half-open"
  let representationId ← safeString (← (values[5]!).getStr?)
    "request.claim.assertion.representation_id"
  let representationContentHash ← requireSha256
    (← (values[6]!).getStr?)
    "request.claim.assertion.representation_content_hash"
  pure {
    callId
    responseDigest
    startByte
    endByte
    representationId
    representationContentHash
  }

private def validateRequest (request : DocumentaryWarrantRequest) :
    Except String DocumentaryWarrantRequest := do
  if request.profileId != metadata.id then
    throw s!"request.profile_id must be {metadata.id}"
  let payload ← parseModelProducedPayload request.claim.assertion
  let [callReference, representationReference] := request.basisRefs
    | throw "request.basis_refs must contain exactly ModelCall and Representation"
  if callReference.kind != "ModelCall" ||
      callReference.id != payload.callId ||
      callReference.revision != payload.responseDigest then
    throw "request.basis_refs[0] does not match the canonical ModelCall payload"
  if representationReference.kind != "Representation" ||
      representationReference.id != payload.representationId ||
      representationReference.revision != payload.representationContentHash then
    throw "request.basis_refs[1] does not match the canonical Representation payload"
  let [claimRepresentation] := request.claim.representationRefs
    | throw "request.claim.representation_refs must contain exactly one Representation"
  if claimRepresentation != representationReference then
    throw "request.claim.representation_refs does not match request.basis_refs"
  pure request

/-- Parse and cross-link the narrow documentary-warrant transfer object. -/
def parseRequestJson (value : Json) : Except String DocumentaryWarrantRequest := do
  requireExactKeys value
    ["schema", "schema_version", "fixture_id", "profile_id", "context_id",
      "admission_id", "admitted_by", "at", "checked_at", "basis_refs", "claim",
      "reason_variable", "rationale", "scope", "derivation_id"] "request"
  let schema ← stringField value "schema" "request"
  if schema != requestSchema then
    throw s!"request.schema must be {requestSchema}"
  let schemaVersion ← (← value.getObjVal? "schema_version").getNat?
  if schemaVersion != requestSchemaVersion then
    throw s!"request.schema_version must be {requestSchemaVersion}"
  validateRequest {
    fixtureId := ← stringField value "fixture_id" "request"
    profileId := ← stringField value "profile_id" "request"
    contextId := ← stringField value "context_id" "request"
    admissionId := ← stringField value "admission_id" "request"
    admittedBy := ← parseActor (← value.getObjVal? "admitted_by")
      "request.admitted_by"
    recordedAt := ← stringField value "at" "request"
    checkedAt := ← stringField value "checked_at" "request"
    basisRefs := ← parseReferences (← value.getObjVal? "basis_refs")
      "request.basis_refs"
    claim := ← parseClaim (← value.getObjVal? "claim")
    reasonVariable := ← stringField value "reason_variable" "request"
    rationale := ← stringField value "rationale" "request"
    scope := ← stringField value "scope" "request"
    derivationId := ← stringField value "derivation_id" "request"
  }

def parseRequest (text : String) : Except String DocumentaryWarrantRequest := do
  let value ← Json.parse text
  if text != Json.compress value ++ "\n" then
    throw "request must be canonical compact JSON followed by one newline"
  parseRequestJson value

def atom (request : DocumentaryWarrantRequest) : AtomKey := {
  id := request.claim.id
  contentHash := request.claim.contentHash
}

def documentaryFormula (request : DocumentaryWarrantRequest) : Formula :=
  .atom (atom request)

def reason (request : DocumentaryWarrantRequest) : Term :=
  .variable request.reasonVariable

def conclusion (request : DocumentaryWarrantRequest) : Formula :=
  .reason (reason request) (documentaryFormula request)

def rawContext (request : DocumentaryWarrantRequest) : RawContext := {
  id := request.contextId
  profileId := request.profileId
  admissions := [{ id := request.admissionId, formula := conclusion request }]
}

def certificate (request : DocumentaryWarrantRequest) : Certificate := {
  nodes := [{
    formula := conclusion request
    rule := .premise request.admissionId
  }]
  conclusion := conclusion request
}

abbrev CheckedRequest (request : DocumentaryWarrantRequest) :=
  Sigma fun context : CheckedContext =>
    CheckedCertificate profile context (certificate request)

/-- Construct the ordinary context and accept the one-node documentary warrant. -/
def checkRequest (request : DocumentaryWarrantRequest) :
    Except String (CheckedRequest request) := do
  let some context := checkContext (rawContext request)
    | throw "documentary warrant context is invalid"
  let some checked := checkCertificate profile context (certificate request)
    | throw "documentary warrant certificate was rejected"
  pure ⟨context, checked⟩

/-! ## Frozen non-evaluative regression fixture -/

def mechanicalRawResponse : String := "Fixture only — α → β.\n"
def mechanicalRawResponseDigest : String :=
  "3edc5ac184de675fa0407c410569597f8a1bf4073d46fc3e65348c2c5dab2bd8"
def mechanicalSpanStart : Nat := 17
def mechanicalSpanEnd : Nat := 26
def mechanicalRepresentation : String := "α → β"
def mechanicalRepresentationContentHash : String :=
  "12df891fcfb3d1af986640343d1cae4a2d5ac9937bf7ec1d4bcc08732d1c9d0a"
def mechanicalAssertion : String :=
  "[\"model-produced-v1\",\"model-call-mechanical-fixture-v1\"," ++
  "\"3edc5ac184de675fa0407c410569597f8a1bf4073d46fc3e65348c2c5dab2bd8\"," ++
  "17,26,\"representation-mechanical-span-v1\"," ++
  "\"12df891fcfb3d1af986640343d1cae4a2d5ac9937bf7ec1d4bcc08732d1c9d0a\"]"
def mechanicalAssertionContentHash : String :=
  "aeb56831ccfb45b47255ca2db06f9885e0a5b1d8a79a38f1e2f51ebcd252bbba"

def mechanicalRequest : DocumentaryWarrantRequest := {
  fixtureId := "ai-documentary-mechanical-fixture-v1"
  profileId := metadata.id
  contextId := "ai-documentary-mechanical-context-v1"
  admissionId := "admission-ai-documentary-mechanical-v1"
  admittedBy := {
    kind := "named_policy"
    id := "ai-documentary-mechanical-policy-v1"
  }
  recordedAt := "2026-09-01T00:00:00Z"
  checkedAt := "2026-09-01T00:00:01Z"
  basisRefs := [
    {
      kind := "ModelCall"
      id := "model-call-mechanical-fixture-v1"
      revision := mechanicalRawResponseDigest
    },
    {
      kind := "Representation"
      id := "representation-mechanical-span-v1"
      revision := mechanicalRepresentationContentHash
    }
  ]
  claim := {
    id := "claim-model-produced-mechanical-fixture-v1"
    displayName := "Model produced selected response span"
    assertion := mechanicalAssertion
    description :=
      "Documentary attribution of exact model-response UTF-8 bytes only."
    representationRefs := [{
      kind := "Representation"
      id := "representation-mechanical-span-v1"
      revision := mechanicalRepresentationContentHash
    }]
    contentHash := mechanicalAssertionContentHash
  }
  reasonVariable := "m"
  rationale :=
    "Admit only that this synthetic finalized-call fixture contains the exact span."
  scope :=
    "Mechanical regression only; no substantive mathematical claim is admitted."
  derivationId := "derivation-ai-documentary-mechanical-v1"
}

theorem mechanicalRawContext_valid : (rawContext mechanicalRequest).isValid = true := by
  decide

def mechanicalContext : CheckedContext :=
  ⟨rawContext mechanicalRequest, mechanicalRawContext_valid⟩

theorem mechanicalCertificate_accepted :
    (checkCertificate profile mechanicalContext
      (certificate mechanicalRequest)).isSome = true := by
  decide

def mechanicalCheckedCertificate :
    CheckedCertificate profile mechanicalContext (certificate mechanicalRequest) :=
  (checkCertificate profile mechanicalContext (certificate mechanicalRequest)).get
    mechanicalCertificate_accepted

theorem mechanical_documentary_derivable :
    Derives profile mechanicalContext (conclusion mechanicalRequest) :=
  mechanicalCheckedCertificate.derivation

def mechanicalSubstantiveAtom : AtomKey := {
  id := "claim-substantive-mechanical-placeholder-v1"
  contentHash :=
    "d5749db926bcec5e2aebcd61c6b27c57a2789283cd2268b84e174a3d79df7d2a"
}

def mechanicalSubstantiveFormula : Formula := .atom mechanicalSubstantiveAtom

theorem mechanicalContext_countermodelValid :
    ContextCountermodelValid mechanicalContext := by
  intro admissionId formula permitted
  simp [CheckedContext.provides, RawContext.provides, mechanicalContext,
    mechanicalRequest, rawContext, conclusion, reason, documentaryFormula,
    atom] at permitted
  rcases permitted with ⟨_, permitted⟩
  subst formula
  rfl

/-- A documentary premise alone does not derive a distinct substantive atom. -/
theorem documentary_only_not_substantive :
    ¬ Derives profile mechanicalContext mechanicalSubstantiveFormula :=
  not_derivable_of_counterEvaluation_false mechanicalContext_countermodelValid
    (by rfl)

end TheoremTerminal.Justification.AIInteraction
