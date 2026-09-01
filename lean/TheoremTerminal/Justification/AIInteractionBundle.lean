import TheoremTerminal.Justification.AIInteraction
import TheoremTerminal.Justification.Bundle

namespace TheoremTerminal.Justification.AIInteractionBundle

open Lean
open TheoremTerminal.Justification
open TheoremTerminal.Justification.AIInteraction

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
        "1b20186f4e3bdd22bf35fda3613597e9b29189756aba7f86cda7dad6b9f1acc6"),
      ("path", .str
        ".lake/build/lib/lean/TheoremTerminal/Justification/Certificate.olean"),
      ("role", .str "certificate_checker")
    ]
  ]),
  ("checker_source_closure", .arr #[
    sourceBindingJson "TheoremTerminal/Justification/Syntax.lean"
      "b75550589988116ac47c94fb4a8cdba112719b34b4d5c826797c7f17f3a9f947",
    sourceBindingJson "TheoremTerminal/Justification/Axioms.lean"
      "aac7ca0b99c2d6670ead7bf9d9e3c2fb3763fdab15c5975f5dae4f1b58ac75e6",
    sourceBindingJson "TheoremTerminal/Justification/ConstantSpecification.lean"
      "50cfbcf008757b39f071395866478edd05181408826850e45c5a6bf64c354a18",
    sourceBindingJson "TheoremTerminal/Justification/Derivation.lean"
      "8557b6e6d345e17783c76c8a89a2d6333cf5096f5909c8b04f97a16c7108e52c",
    sourceBindingJson "TheoremTerminal/Justification/Certificate.lean"
      "9bd4379f4f8cb108e39cebd29a9e828297875e1f7ba21fd486b47461e12ddb93",
    sourceBindingJson "TheoremTerminal/Justification/Semantics.lean"
      "777f180a4640dcf2edbbee875d5c5df2f74e197a87fafd9399332f9edf2ddf58"
  ]),
  ("fixture_source",
    sourceBindingJson "TheoremTerminal/Justification/AIInteraction.lean"
      "1376f9c87c26ba7af0fb0077104b70487f2f02f96659428873ebe4cb8d7726b2"),
  ("lake_manifest_digest", digestJson
    "d0c86d76b61b09fb475c8bd48f54e2590755043b71641656c9a967b3a91ee2b5"),
  ("lakefile_digest", digestJson
    "51470072fff98e4749623db56d836354f2adf477fe70aca04dd454cb6ae410d3"),
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
    ("schema", .str "theorem-terminal.justification-bundle"),
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

end TheoremTerminal.Justification.AIInteractionBundle
