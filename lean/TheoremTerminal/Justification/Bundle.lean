import Lean.Data.Json.Printer
import TheoremTerminal.Justification.AppendixA

namespace TheoremTerminal.Justification

open Lean

private def digestJson (algorithm value : String) : Json :=
  Json.mkObj [
    ("algorithm", .str algorithm),
    ("value", .str value)
  ]

def termJson : Term → Json
  | .variable name => .arr #[.str "variable", .str name]
  | .constant name => .arr #[.str "constant", .str name]
  | .application function argument =>
      .arr #[.str "application", termJson function, termJson argument]
  | .sum left right => .arr #[.str "sum", termJson left, termJson right]

def formulaJson : Formula → Json
  | .atom atom => .arr #[
      .str "atom",
      Json.mkObj [
        ("content_hash", digestJson "sha256" atom.contentHash),
        ("id", .str atom.id)
      ]
    ]
  | .bottom => .arr #[.str "bottom"]
  | .implication antecedent consequent =>
      .arr #[.str "implication", formulaJson antecedent, formulaJson consequent]
  | .reason term formula =>
      .arr #[.str "reason", termJson term, formulaJson formula]

private def ruleJson : Rule → Json
  | .premise admissionId => Json.mkObj [
      ("admission_id", .str admissionId),
      ("kind", .str "premise")
    ]
  | .axiom kind => Json.mkObj [
      ("axiom_kind", .str kind.name),
      ("kind", .str "logical_axiom")
    ]
  | .constantSpecification memberId => Json.mkObj [
      ("kind", .str "constant_specification"),
      ("member_id", .str memberId)
    ]
  | .modusPonens major minor => Json.mkObj [
      ("kind", .str "modus_ponens"),
      ("major", .num major),
      ("minor", .num minor)
    ]

private def nodesJsonFrom : Nat → List Node → List Json
  | _, [] => []
  | index, node :: rest =>
      Json.mkObj [
        ("formula", formulaJson node.formula),
        ("index", .num index),
        ("rule", ruleJson node.rule)
      ] :: nodesJsonFrom (index + 1) rest

private def csMemberJson (member : ConstantSpecificationMember) : Json :=
  Json.mkObj [
    ("formula", formulaJson member.formula),
    ("id", .str member.id)
  ]

private def referenceJson (kind id : String) : Json :=
  Json.mkObj [("id", .str id), ("kind", .str kind)]

private def revisedReferenceJson (kind id revision : String) : Json :=
  Json.mkObj [
    ("id", .str id),
    ("kind", .str kind),
    ("revision", .str revision)
  ]

private def claimJson (id displayName assertion description : String)
    (representationRefs : Array Json) (contentHash : String) : Json :=
  Json.mkObj [
    ("assertion", .str assertion),
    ("content_hash", digestJson "sha256" contentHash),
    ("description", .str description),
    ("display_name", .str displayName),
    ("id", .str id),
    ("representation_refs", .arr representationRefs)
  ]

private def admissionsJson : Json := .arr #[
  Json.mkObj [
    ("admitted_by", Json.mkObj [
      ("id", .str "appendix-a-kernel-attestation-admission-policy-v1"),
      ("kind", .str "named_policy")
    ]),
    ("at", .str "2026-09-01T15:10:00Z"),
    ("basis_refs", .arr #[
      referenceJson "Verification" "verification-kernel-attestation-range-lifting-v1"
    ]),
    ("formula", formulaJson AppendixA.premiseK),
    ("id", .str "admission-kernel-attestation-v1"),
    ("rationale", .str
      "Admit only the exact documentary kernel-attestation claim produced by the recorded run."),
    ("scope", .str
      "Only this exact theorem, attestation transcript, frozen environment, claim version, and fixture."),
    ("supersedes", .null)
  ],
  Json.mkObj [
    ("admitted_by", Json.mkObj [
      ("id", .str "appendix-a-formal-proof-policy-v1"),
      ("kind", .str "named_policy")
    ]),
    ("at", .str "2026-09-01T15:10:00Z"),
    ("basis_refs", .arr #[
      referenceJson "Verification" "verification-kernel-attestation-range-lifting-v1",
      revisedReferenceJson "FormalFact"
        "CategoryTheory.Dom.exists_total_lift_iff_rangeLiftPullback_section"
        "fdd1a01b893b125a802ea375aee051ab640c3be7"
    ]),
    ("formula", formulaJson AppendixA.premiseP),
    ("id", .str "admission-formal-proof-policy-v1"),
    ("rationale", .str
      "The named policy licenses only the directional bridge from this exact successful kernel attestation to this exact formal judgment."),
    ("scope", .str
      "Only the exact K and F_L claim versions, frozen import closure, declaration type, axiom report, and fixture."),
    ("supersedes", .null)
  ],
  Json.mkObj [
    ("admitted_by", Json.mkObj [
      ("id", .str "appendix-a-reviewed-correspondence-policy-v1"),
      ("kind", .str "named_policy")
    ]),
    ("at", .str "2026-09-01T15:10:00Z"),
    ("basis_refs", .arr #[
      referenceJson "SourceOccurrence" "source-occurrence-appendix-a-range-lifting-v1",
      revisedReferenceJson "FormalFact"
        "CategoryTheory.Dom.exists_total_lift_iff_rangeLiftPullback_section"
        "fdd1a01b893b125a802ea375aee051ab640c3be7",
      referenceJson "Correspondence" "correspondence-appendix-a-range-lifting-v1"
    ]),
    ("formula", formulaJson AppendixA.premiseA),
    ("id", .str "admission-reviewed-correspondence-v1"),
    ("rationale", .str
      "The reviewed directional correspondence licenses F_L to F_M; matching names and the mapping document alone do not."),
    ("scope", .str
      "Only the exact F_L and F_M claim versions, reviewed source occurrence, formal declaration, and fixture."),
    ("supersedes", .null)
  ]
]

private def contextJson : Json := Json.mkObj [
  ("added", .arr #[
    .str "admission-kernel-attestation-v1",
    .str "admission-formal-proof-policy-v1",
    .str "admission-reviewed-correspondence-v1"
  ]),
  ("admissions", .arr #[
    .str "admission-kernel-attestation-v1",
    .str "admission-formal-proof-policy-v1",
    .str "admission-reviewed-correspondence-v1"
  ]),
  ("change_kind", .str "initial"),
  ("created_at", .str "2026-09-01T15:10:00Z"),
  ("created_by", Json.mkObj [
    ("id", .str "appendix-a-warrant-fixture-policy-v1"),
    ("kind", .str "named_policy")
  ]),
  ("id", .str AppendixA.rawContext.id),
  ("predecessor", .null),
  ("profile", .str AppendixA.metadata.id),
  ("rationale", .str
    "Initial context for the exact Appendix A kernel-policy-correspondence route."),
  ("removed", .arr #[])
]

private def importClosureJson : Json := .arr #[
  Json.mkObj [
    ("git_blob", digestJson "git-sha1" "8be04e263211438f27484d6f83f8dd6865b9b4a2"),
    ("path", .str "Lean/PCats/Restriction.lean")
  ],
  Json.mkObj [
    ("git_blob", digestJson "git-sha1" "f9e174b3baa0e8661ec42a509f02567fac2e0717"),
    ("path", .str "Lean/PCats/PCat.lean")
  ],
  Json.mkObj [
    ("git_blob", digestJson "git-sha1" "2968973816c262e877d985c0f775babe0f2d46e8"),
    ("path", .str "Lean/PCats/Ranges.lean")
  ],
  Json.mkObj [
    ("git_blob", digestJson "git-sha1" "0d38fd4a914326b82b347128c37acc3649e1cdcf"),
    ("path", .str "Lean/PCats/Domains.lean")
  ],
  Json.mkObj [
    ("git_blob", digestJson "git-sha1" "c21293b42ddb31bc4ae56b924028b6fe5dcb3de8"),
    ("path", .str "Lean/PCats/DomProducts.lean")
  ],
  Json.mkObj [
    ("git_blob", digestJson "git-sha1" "62cd311de1380fa80e70d60a5bd4913c9414d447"),
    ("path", .str "Lean/PCats/DomSubdomains.lean")
  ],
  Json.mkObj [
    ("git_blob", digestJson "git-sha1" "a0fe49c0e2da6e202af24a4444671ef6d8daa0b1"),
    ("path", .str "Lean/PCats/DomEqualizers.lean")
  ],
  Json.mkObj [
    ("git_blob", digestJson "git-sha1" "dc6ea0ec50c29c9006b78adb088d4713508487ed"),
    ("path", .str "Lean/PCats/DomPullbacks.lean")
  ]
]

private def externalVerificationJson : Json := Json.mkObj [
  ("at", .str "2026-09-01T15:03:05Z"),
  ("axiom_report", .arr #[.str "propext"]),
  ("checker_revision", .str
    "f3b06c705e6c85f5314019d5d3baab0fec5b580c"),
  ("claim_checked", .str AppendixA.formalAssertion),
  ("command", .str "NO_COLOR=1 lake env lean PCatsAttestation.lean"),
  ("command_argv", .arr #[
    .str "lake", .str "env", .str "lean", .str "PCatsAttestation.lean"
  ]),
  ("completed_at", .str "2026-09-01T15:03:05Z"),
  ("context", .null),
  ("environment", Json.mkObj [
    ("attestation_source_digest", digestJson "sha256"
      "9940f7362a2dfb234461d5d359fa5d2785b8a1a5e21033b6782e48cfb0f1b328"),
    ("categorical_repository", .str "flengyel/Categorical_Rice_Shapiro"),
    ("categorical_revision", .str
      "fdd1a01b893b125a802ea375aee051ab640c3be7"),
    ("command_environment", Json.mkObj [("NO_COLOR", .str "1")]),
    ("import_closure", importClosureJson),
    ("imports", .arr #[.str "PCats.DomPullbacks"]),
    ("lake_manifest_digest", digestJson "sha256"
      "075ed40f0d1dff3c0cbab93f40a3c93a1c0b75fcb94a7a83225de39627854774"),
    ("lakefile_digest", digestJson "sha256"
      "bf7ec4f40366cb887fd57855235df6ef74203deadbb6d1a3fa06644ee0601680"),
    ("lean_commit", .str "f3b06c705e6c85f5314019d5d3baab0fec5b580c"),
    ("lean_version", .str "4.32.2"),
    ("mathlib_revision", .str
      "905b95818eb32af7874a58b427f50c1711a5e96c"),
    ("options", Json.mkObj [
      ("autoImplicit", .bool false),
      ("relaxedAutoImplicit", .bool false)
    ]),
    ("toolchain_digest", digestJson "sha256"
      "6a79a95d58e5ea742eb0cead94a27dc206ddd4aaf7d65419b19b0e4017daa982")
  ]),
  ("exit_code", .num 0),
  ("id", .str "verification-kernel-attestation-range-lifting-v1"),
  ("method", .str "lean_kernel"),
  ("output_artifact", .str ".lake/build/lib/lean/PCatsAttestation.olean"),
  ("output_digest", digestJson "sha256"
    "be983511132d199019fe48808011a72bb88c7b317992dd64aee469738c368bdb"),
  ("profile", .null),
  ("result", .str "passed"),
  ("started_at", .str "2026-09-01T15:03:03Z"),
  ("stderr", .str ""),
  ("stderr_byte_length", .num 0),
  ("stderr_digest", digestJson "sha256"
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
  ("stdout", .str AppendixA.attestationStdout),
  ("stdout_byte_length", .num 551),
  ("stdout_digest", digestJson "sha256"
    "97953c4623e4c5815b7c73cfc613f969652a86fe3cf3d52399e178e696336c6a"),
  ("subject", .str "formal-declaration-range-lifting-v1"),
  ("working_directory_role", .str "frozen_attestation_lake_root")
]

private def relatedSourceBindingsJson : Json := .arr #[
  Json.mkObj [
    ("checked_in_this_run", .bool false),
    ("git_blob", digestJson "git-sha1"
      "5e87de9e9e040cec2a0dab3b3b4fed20d9ee955a"),
    ("id", .str "source-occurrence-appendix-a-range-lifting-v1"),
    ("kind", .str "source_occurrence"),
    ("label", .str "lem:range-lifting-pullback-section"),
    ("normalized_digest", digestJson "sha256"
      "51c3669da3b3a850b1cf8f61f10f873f297d6a598f01d3541678137f002b1945"),
    ("path", .str "rs_Appendix_A.tex"),
    ("repository", .str "flengyel/Categorical_Rice_Shapiro"),
    ("repository_revision", .str
      "fdd1a01b893b125a802ea375aee051ab640c3be7"),
    ("statement_digest", digestJson "sha256"
      "cf70f020ab60e0a7b8b5b337d7f226d57787535f8fe1531bfa9b7f7f51a46849"),
    ("statement_utf8_byte_length", .num 858)
  ],
  Json.mkObj [
    ("checked_in_this_run", .bool true),
    ("declaration", .str
      "CategoryTheory.Dom.exists_total_lift_iff_rangeLiftPullback_section"),
    ("exact_type_digest", digestJson "sha256"
      "0697f499e820e58fd6a2bddcde2f9eb5b2b2a23b436b9424bb676aa98910b83b"),
    ("exact_type_utf8_byte_length", .num 453),
    ("git_blob", digestJson "git-sha1"
      "dc6ea0ec50c29c9006b78adb088d4713508487ed"),
    ("id", .str "formal-declaration-range-lifting-v1"),
    ("kind", .str "formal_fact"),
    ("path", .str "Lean/PCats/DomPullbacks.lean"),
    ("repository", .str "flengyel/Categorical_Rice_Shapiro"),
    ("repository_revision", .str
      "fdd1a01b893b125a802ea375aee051ab640c3be7")
  ],
  Json.mkObj [
    ("checked_in_this_run", .bool false),
    ("direction", .str "formal_to_manuscript"),
    ("git_blob", digestJson "git-sha1"
      "9da7f070deedecdaeed9cd082fea37eac459ca74"),
    ("id", .str "correspondence-appendix-a-range-lifting-v1"),
    ("kind", .str "correspondence_basis"),
    ("path", .str "Lean/docs/AppendixA.md"),
    ("repository", .str "flengyel/Categorical_Rice_Shapiro"),
    ("repository_revision", .str
      "fdd1a01b893b125a802ea375aee051ab640c3be7"),
    ("reviewed_by", .str "appendix-a-reviewed-correspondence-policy-v1"),
    ("source_claim", .str AppendixA.formalAtom.id),
    ("target_claim", .str AppendixA.manuscriptAtom.id)
  ],
  Json.mkObj [
    ("checked_in_this_run", .bool false),
    ("git_blob", digestJson "git-sha1"
      "9d38767c10c9f0ed4ad1761b3d80d4604902c6f2"),
    ("id", .str "dom-pullbacks-regression-signature-guard-v1"),
    ("kind", .str "signature_guard_source"),
    ("path", .str "Lean/Tests/DomPullbacksRegression.lean"),
    ("repository", .str "flengyel/Categorical_Rice_Shapiro"),
    ("repository_revision", .str
      "fdd1a01b893b125a802ea375aee051ab640c3be7")
  ]
]

private def dependencyRefsJson : Json := .arr #[
  revisedReferenceJson "ClaimAtomVersion" AppendixA.kernelAtom.id
    AppendixA.kernelAtom.contentHash,
  revisedReferenceJson "ClaimAtomVersion" AppendixA.formalAtom.id
    AppendixA.formalAtom.contentHash,
  revisedReferenceJson "ClaimAtomVersion" AppendixA.manuscriptAtom.id
    AppendixA.manuscriptAtom.contentHash,
  revisedReferenceJson "Verification"
    "verification-kernel-attestation-range-lifting-v1"
    "97953c4623e4c5815b7c73cfc613f969652a86fe3cf3d52399e178e696336c6a",
  revisedReferenceJson "SourceOccurrence"
    "source-occurrence-appendix-a-range-lifting-v1"
    "51c3669da3b3a850b1cf8f61f10f873f297d6a598f01d3541678137f002b1945",
  revisedReferenceJson "FormalFact"
    "CategoryTheory.Dom.exists_total_lift_iff_rangeLiftPullback_section"
    "fdd1a01b893b125a802ea375aee051ab640c3be7",
  revisedReferenceJson "Correspondence"
    "correspondence-appendix-a-range-lifting-v1"
    "9da7f070deedecdaeed9cd082fea37eac459ca74"
]

private def profileJson : Json := Json.mkObj [
  ("checker", .str AppendixA.metadata.checker),
  ("checker_version", .str AppendixA.metadata.checkerVersion),
  ("constant_specification", .null),
  ("id", .str AppendixA.metadata.id),
  ("rule_version", .str AppendixA.metadata.ruleVersion),
  ("syntax_version", .str AppendixA.metadata.syntaxVersion),
  ("system", .str "J0")
]

private def derivationJson
    (checked : CheckedCertificate AppendixA.profile AppendixA.context
      AppendixA.certificate) : Json :=
  Json.mkObj [
    ("certificate_version", .str "ordered-dag-certificate-v1"),
    ("conclusion", formulaJson AppendixA.certificate.conclusion),
    ("constant_specification_footprint",
      .arr (checked.constantSpecificationFootprint.map csMemberJson).toArray),
    ("context", .str AppendixA.rawContext.id),
    ("dependency_refs", dependencyRefsJson),
    ("id", .str "derivation-appendix-a-range-lifting-v1"),
    ("nodes", .arr (nodesJsonFrom 0 AppendixA.certificate.nodes).toArray),
    ("profile", .str AppendixA.metadata.id)
  ]

private def justificationVerificationJson : Json := Json.mkObj [
  ("at", .str "2026-09-01T15:10:00Z"),
  ("checker", .str AppendixA.metadata.checker),
  ("checker_revision", .str AppendixA.metadata.checkerVersion),
  ("claim_checked", .str
    "The certificate denotes the recorded conclusion under the exact profile and context."),
  ("context", .str AppendixA.rawContext.id),
  ("environment", Json.mkObj [
    ("checked_artifacts", .arr #[
      Json.mkObj [
        ("digest", digestJson "sha256"
          "1b20186f4e3bdd22bf35fda3613597e9b29189756aba7f86cda7dad6b9f1acc6"),
        ("path", .str
          ".lake/build/lib/lean/TheoremTerminal/Justification/Certificate.olean"),
        ("role", .str "certificate_checker")
      ],
      Json.mkObj [
        ("digest", digestJson "sha256"
          "6a12fc7cb150b9b712b56a803e6158a1bbb09c9c02d62d92e72e9b5329217085"),
        ("path", .str
          ".lake/build/lib/lean/TheoremTerminal/Justification/AppendixA.olean"),
        ("role", .str "checked_fixture_witness")
      ]
    ]),
    ("checker_source_closure", .arr #[
      Json.mkObj [
        ("digest", digestJson "sha256"
          "b75550589988116ac47c94fb4a8cdba112719b34b4d5c826797c7f17f3a9f947"),
        ("path", .str "TheoremTerminal/Justification/Syntax.lean")
      ],
      Json.mkObj [
        ("digest", digestJson "sha256"
          "aac7ca0b99c2d6670ead7bf9d9e3c2fb3763fdab15c5975f5dae4f1b58ac75e6"),
        ("path", .str "TheoremTerminal/Justification/Axioms.lean")
      ],
      Json.mkObj [
        ("digest", digestJson "sha256"
          "50cfbcf008757b39f071395866478edd05181408826850e45c5a6bf64c354a18"),
        ("path", .str
          "TheoremTerminal/Justification/ConstantSpecification.lean")
      ],
      Json.mkObj [
        ("digest", digestJson "sha256"
          "8557b6e6d345e17783c76c8a89a2d6333cf5096f5909c8b04f97a16c7108e52c"),
        ("path", .str "TheoremTerminal/Justification/Derivation.lean")
      ],
      Json.mkObj [
        ("digest", digestJson "sha256"
          "9bd4379f4f8cb108e39cebd29a9e828297875e1f7ba21fd486b47461e12ddb93"),
        ("path", .str "TheoremTerminal/Justification/Certificate.lean")
      ],
      Json.mkObj [
        ("digest", digestJson "sha256"
          "777f180a4640dcf2edbbee875d5c5df2f74e197a87fafd9399332f9edf2ddf58"),
        ("path", .str "TheoremTerminal/Justification/Semantics.lean")
      ]
    ]),
    ("fixture_source", Json.mkObj [
      ("digest", digestJson "sha256"
        "38984392f74ba3d8cf40d0039469ad76e48bdc27acebfa0f499f849a9af18a77"),
      ("path", .str "TheoremTerminal/Justification/AppendixA.lean")
    ]),
    ("lake_manifest_digest", digestJson "sha256"
      "d0c86d76b61b09fb475c8bd48f54e2590755043b71641656c9a967b3a91ee2b5"),
    ("lakefile_digest", digestJson "sha256"
      "51470072fff98e4749623db56d836354f2adf477fe70aca04dd454cb6ae410d3"),
    ("lean_commit", .str "f3b06c705e6c85f5314019d5d3baab0fec5b580c"),
    ("lean_version", .str "4.32.2"),
    ("toolchain_digest", digestJson "sha256"
      "2bdc48adfa58d0017e538a0ad117c5d73d35deec879978f909406a80c8037273")
  ]),
  ("id", .str "verification-appendix-a-justification-v1"),
  ("method", .str "justification_checker"),
  ("profile", .str AppendixA.metadata.id),
  ("result", .str "passed"),
  ("subject", .str "derivation-appendix-a-range-lifting-v1")
]

/-- Build the fixed audit bundle only from the kernel-checked fixture witness. -/
def appendixBundleJson : Json :=
  let checked := AppendixA.checkedCertificate
  Json.mkObj [
    ("admissions", admissionsJson),
    ("claims", .arr #[
      claimJson AppendixA.kernelAtom.id "Exact Lean kernel attestation"
        AppendixA.kernelAssertion
        "The recorded frozen run elaborated the exact formal proposition and reported only propext."
        #[referenceJson "Verification"
          "verification-kernel-attestation-range-lifting-v1"]
        AppendixA.kernelAtom.contentHash,
      claimJson AppendixA.formalAtom.id "Exact formal range-lifting judgment"
        AppendixA.formalAssertion
        "The exact proposition of the frozen Lean declaration."
        #[referenceJson "FormalFact" "formal-declaration-range-lifting-v1"]
        AppendixA.formalAtom.contentHash,
      claimJson AppendixA.manuscriptAtom.id "Appendix A range-lifting claim"
        AppendixA.manuscriptAssertion
        "The exact labeled manuscript occurrence at the reviewed normalized source revision."
        #[referenceJson "SourceOccurrence"
          "source-occurrence-appendix-a-range-lifting-v1"]
        AppendixA.manuscriptAtom.contentHash
    ]),
    ("context", contextJson),
    ("derivation", derivationJson checked),
    ("external_verifications", .arr #[externalVerificationJson]),
    ("fixture_id", .str "appendix-a-range-lifting-warrant-v1"),
    ("justification_verification", justificationVerificationJson),
    ("profile", profileJson),
    ("related_source_bindings", relatedSourceBindingsJson),
    ("schema", .str "theorem-terminal.justification-bundle"),
    ("schema_version", .num 1)
  ]

def appendixBundleBytes : ByteArray :=
  (Json.compress appendixBundleJson ++ "\n").toUTF8

end TheoremTerminal.Justification
