import MRW.Justification.AIInteraction
import MRW.Justification.Bundle

namespace MRW.Justification.AIInteractionBundle

open Lean
open MRW.Justification
open MRW.Justification.AIInteraction

private def digestJson (value : String) : Json :=
  Json.mkObj [
    ("algorithm", .str "sha256"),
    ("value", .str value)
  ]

private def referenceJson (reference : Reference) : Json :=
  Json.mkObj [
    ("id", .str reference.id),
    ("kind", .str reference.kind),
    ("revision", .str reference.revision)
  ]

private def actorJson (actor : Actor) : Json :=
  Json.mkObj [
    ("id", .str actor.id),
    ("kind", .str actor.kind)
  ]

private def profileJson : Json := Json.mkObj [
  ("checker", .str metadata.checker),
  ("checker_version", .str metadata.checkerVersion),
  ("constant_specification", .null),
  ("id", .str metadata.id),
  ("rule_version", .str metadata.ruleVersion),
  ("syntax_version", .str metadata.syntaxVersion),
  ("system", .str "J0")
]

private def claimJson (request : DocumentaryWarrantRequest) : Json :=
  Json.mkObj [
    ("assertion", .str request.claim.assertion),
    ("content_hash", digestJson request.claim.contentHash),
    ("description", .str request.claim.description),
    ("display_name", .str request.claim.displayName),
    ("id", .str request.claim.id),
    ("representation_refs",
      .arr (request.claim.representationRefs.map referenceJson).toArray)
  ]

private def admissionJson (request : DocumentaryWarrantRequest) : Json :=
  Json.mkObj [
    ("admitted_by", actorJson request.admittedBy),
    ("at", .str request.recordedAt),
    ("basis_refs", .arr (request.basisRefs.map referenceJson).toArray),
    ("formula", formulaJson (conclusion request)),
    ("id", .str request.admissionId),
    ("rationale", .str request.rationale),
    ("scope", .str request.scope),
    ("supersedes", .null)
  ]

private def contextJson (request : DocumentaryWarrantRequest) : Json :=
  Json.mkObj [
    ("added", .arr #[.str request.admissionId]),
    ("admissions", .arr #[.str request.admissionId]),
    ("change_kind", .str "initial"),
    ("created_at", .str request.recordedAt),
    ("created_by", actorJson request.admittedBy),
    ("id", .str request.contextId),
    ("predecessor", .null),
    ("profile", .str metadata.id),
    ("rationale", .str request.rationale),
    ("removed", .arr #[])
  ]

private def dependencyRefsJson (request : DocumentaryWarrantRequest) : Json :=
  .arr <| #[
    Json.mkObj [
      ("id", .str request.claim.id),
      ("kind", .str "ClaimAtomVersion"),
      ("revision", .str request.claim.contentHash)
    ]
  ] ++ (request.basisRefs.map referenceJson).toArray

private def derivationJson (request : DocumentaryWarrantRequest)
    (checked : CheckedRequest request) : Json :=
  let ⟨_, certificateWitness⟩ := checked
  Json.mkObj [
    ("certificate_version", .str "ordered-dag-certificate-v1"),
    ("conclusion", formulaJson (conclusion request)),
    ("constant_specification_footprint",
      .arr ((certificateWitness.constantSpecificationFootprint.map fun member =>
        Json.mkObj [
          ("formula", formulaJson member.formula),
          ("id", .str member.id)
        ]).toArray)),
    ("context", .str request.contextId),
    ("dependency_refs", dependencyRefsJson request),
    ("id", .str request.derivationId),
    ("nodes", .arr #[
      Json.mkObj [
        ("formula", formulaJson (conclusion request)),
        ("index", .num 0),
        ("rule", Json.mkObj [
          ("admission_id", .str request.admissionId),
          ("kind", .str "premise")
        ])
      ]
    ]),
    ("profile", .str metadata.id)
  ]

private def sourceBindingJson (path digest : String) : Json :=
  Json.mkObj [
    ("digest", digestJson digest),
    ("path", .str path)
  ]

private def checkerEnvironmentJson : Json := Json.mkObj [
  ("checked_artifacts", .arr #[
    Json.mkObj [
      ("digest", digestJson
        "91cb1ada39495504a09acb1ea8c092c1e693b390133032f60b6af1112598820f"),
      ("path", .str
        ".lake/build/lib/lean/MRW/Justification/Certificate.olean"),
      ("role", .str "certificate_checker")
    ]
  ]),
  ("checker_source_closure", .arr #[
    sourceBindingJson "MRW/Justification/Syntax.lean"
      "80fd0c32339aa552086b351358be6115700075a79f9632f82fe2629a51237957",
    sourceBindingJson "MRW/Justification/Axioms.lean"
      "2d685cd4b31fb1d2677b3a5424de3ca5406086f121c4e4fbea59372929c58353",
    sourceBindingJson "MRW/Justification/ConstantSpecification.lean"
      "e7dc5d356c1e9520d2ed85373c46ee169d390cdad214b860549587ea62c0d7ac",
    sourceBindingJson "MRW/Justification/Derivation.lean"
      "d3bd8b5c3621bc4575fe51907f521543a67964c443285a88593972a4970e80d0",
    sourceBindingJson "MRW/Justification/Certificate.lean"
      "d35aa505d8f7ed51dec6cc66c3e3283aa278b32f9ecbcb7515391b10e23edc9b",
    sourceBindingJson "MRW/Justification/Semantics.lean"
      "a52b476ad67dbf2dbbe365b0f261722d63dafd51ae46712c9adb7e5e7effaadd"
  ]),
  ("fixture_source",
    sourceBindingJson "MRW/Justification/AIInteraction.lean"
      "75850e15594152e3bb76dfece2b50efab1579dabb00bf17067d9a5abce2ed3b9"),
  ("lake_manifest_digest", digestJson
    "791cfa5839cb7efbfd47e9844b6e65f0ad7108735602255f126ad62c9360bd29"),
  ("lakefile_digest", digestJson
    "88335c65f9b47fc22a166cd660c22dd8a0aed0a8f350b6fff55b4cb13da9e0ee"),
  ("lean_commit", .str "f3b06c705e6c85f5314019d5d3baab0fec5b580c"),
  ("lean_version", .str "4.32.2"),
  ("toolchain_digest", digestJson
    "2bdc48adfa58d0017e538a0ad117c5d73d35deec879978f909406a80c8037273")
]

private def justificationVerificationJson
    (request : DocumentaryWarrantRequest) : Json :=
  Json.mkObj [
    ("at", .str request.checkedAt),
    ("checker", .str metadata.checker),
    ("checker_revision", .str metadata.checkerVersion),
    ("claim_checked", .str
      "The certificate denotes the documentary conclusion under the exact profile and context."),
    ("context", .str request.contextId),
    ("environment", checkerEnvironmentJson),
    ("id", .str ("verification-" ++ request.fixtureId)),
    ("method", .str "justification_checker"),
    ("profile", .str metadata.id),
    ("result", .str "passed"),
    ("subject", .str request.derivationId)
  ]

/-- Serialize a documentary bundle only after the existing Lean checker accepts it. -/
def bundleJson (request : DocumentaryWarrantRequest)
    (checked : CheckedRequest request) : Json :=
  Json.mkObj [
    ("admissions", .arr #[admissionJson request]),
    ("claims", .arr #[claimJson request]),
    ("context", contextJson request),
    ("derivation", derivationJson request checked),
    ("external_verifications", .arr #[]),
    ("fixture_id", .str request.fixtureId),
    ("justification_verification", justificationVerificationJson request),
    ("profile", profileJson),
    ("related_source_bindings", .arr #[]),
    ("schema", .str "mrw.justification-bundle"),
    ("schema_version", .num 1)
  ]

def bundleBytes (request : DocumentaryWarrantRequest)
    (checked : CheckedRequest request) : ByteArray :=
  (Json.compress (bundleJson request checked) ++ "\n").toUTF8

/-- Parse, cross-link, check, and serialize one documentary request. -/
def bundleBytesFromText (text : String) : Except String ByteArray := do
  let request ← parseRequest text
  let checked ← checkRequest request
  pure (bundleBytes request checked)

def mechanicalCheckedRequest : CheckedRequest mechanicalRequest :=
  ⟨mechanicalContext, mechanicalCheckedCertificate⟩

def mechanicalBundleBytes : ByteArray :=
  bundleBytes mechanicalRequest mechanicalCheckedRequest

end MRW.Justification.AIInteractionBundle
