import MRW

namespace MRW.Justification.Tests

open MRW.Justification

private def atom (name : String) : Formula :=
  .atom { id := name, contentHash := "test-" ++ name }

def P : Formula := atom "P"
def Q : Formula := atom "Q"
def R : Formula := atom "R"

def x : Term := .variable "x"
def y : Term := .variable "y"

def kAxiom : Formula := .implication P (.implication Q P)
def sAxiom : Formula :=
  .implication (.implication P (.implication Q R))
    (.implication (.implication P Q) (.implication P R))
def exFalsoAxiom : Formula := .implication .bottom P
def doubleNegationAxiom : Formula :=
  .implication (.implication (.implication P .bottom) .bottom) P
def applicationAxiom : Formula :=
  .implication (.reason x (.implication P Q))
    (.implication (.reason y P) (.reason (.application x y) Q))
def sumLeftAxiom : Formula :=
  .implication (.reason x P) (.reason (.sum x y) P)
def sumRightAxiom : Formula :=
  .implication (.reason y P) (.reason (.sum x y) P)

def testMetadata (id : String) : ProfileMetadata := {
  id := id
  syntaxVersion := "justification-syntax-v1"
  ruleVersion := "j0-hilbert-v1"
  checker := "MRW.Justification.checkCertificate"
  checkerVersion := "justification-checker-v1"
}

def emptyRawContext (profileId : String) : RawContext := {
  id := "empty-context-" ++ profileId
  profileId := profileId
  admissions := []
}

theorem emptyRawContext_valid (profileId : String) (nonempty : profileId.isEmpty = false) :
    (emptyRawContext profileId).isValid = true := by
  simp [emptyRawContext, RawContext.isValid, nonempty]
  rfl

def checkedEmptyContext (profileId : String)
    (nonempty : profileId.isEmpty = false) : CheckedContext :=
  ⟨emptyRawContext profileId, emptyRawContext_valid profileId nonempty⟩

def j0Metadata : ProfileMetadata := testMetadata "test-j0-v1"
def j0Profile : Profile := .j0 j0Metadata
def j0Context : CheckedContext := checkedEmptyContext j0Metadata.id (by decide)

def mislabeledMetadata : ProfileMetadata := {
  id := "test-mislabeled-j0-v1"
  syntaxVersion := "justification-syntax-v1"
  ruleVersion := "not-the-implemented-rules"
  checker := "MRW.Justification.checkCertificate"
  checkerVersion := "justification-checker-v1"
}

def mislabeledProfile : Profile := .j0 mislabeledMetadata
def mislabeledContext : CheckedContext :=
  checkedEmptyContext mislabeledMetadata.id (by decide)

def axiomCertificate (kind : AxiomKind) (formula : Formula) : Certificate := {
  nodes := [{ formula := formula, rule := .axiom kind }]
  conclusion := formula
}

def cMemberFormula : Formula := .reason (.constant "c") kAxiom
def dMemberFormula : Formula := .reason (.constant "d") cMemberFormula

def validCSRaw : RawConstantSpecification := {
  id := "test-finite-cs-v1"
  revision := "1"
  members := [
    { id := "member-c-k", formula := cMemberFormula },
    { id := "member-d-c-k", formula := dMemberFormula }
  ]
}

theorem validCSRaw_valid : validCSRaw.isValid = true := by decide
def validCS : CheckedConstantSpecification := ⟨validCSRaw, validCSRaw_valid⟩

def jcsMetadata : ProfileMetadata := testMetadata "test-jcs-v1"
def jcsProfile : Profile := .jcs jcsMetadata validCS
def jcsContext : CheckedContext := checkedEmptyContext jcsMetadata.id (by decide)

def csCertificate : Certificate := {
  nodes := [{
    formula := cMemberFormula
    rule := .constantSpecification "member-c-k"
  }]
  conclusion := cMemberFormula
}

def j0PremiseRawContext : RawContext := {
  id := "test-j0-premise-context-v1"
  profileId := j0Metadata.id
  admissions := [{ id := "admit-c-k", formula := cMemberFormula }]
}

theorem j0PremiseRawContext_valid : j0PremiseRawContext.isValid = true := by decide
def j0PremiseContext : CheckedContext :=
  ⟨j0PremiseRawContext, j0PremiseRawContext_valid⟩

def j0PremiseCertificate : Certificate := {
  nodes := [{ formula := cMemberFormula, rule := .premise "admit-c-k" }]
  conclusion := cMemberFormula
}

def repeatedCSCertificate : Certificate := {
  nodes := [
    { formula := cMemberFormula,
      rule := .constantSpecification "member-c-k" },
    { formula := .implication cMemberFormula
        (.implication cMemberFormula cMemberFormula),
      rule := .axiom .k },
    { formula := .implication cMemberFormula cMemberFormula,
      rule := .modusPonens 1 0 },
    { formula := cMemberFormula,
      rule := .constantSpecification "member-c-k" },
    { formula := cMemberFormula,
      rule := .modusPonens 2 3 }
  ]
  conclusion := cMemberFormula
}

def wrongCSMemberCertificate : Certificate := {
  nodes := [{
    formula := cMemberFormula
    rule := .constantSpecification "wrong-member"
  }]
  conclusion := cMemberFormula
}

def unlistedCSCertificate : Certificate := {
  nodes := [{
    formula := .reason (.constant "e") dMemberFormula
    rule := .constantSpecification "member-e-d-c-k"
  }]
  conclusion := .reason (.constant "e") dMemberFormula
}

def emptyCertificate : Certificate := {
  nodes := []
  conclusion := P
}

def selfReferenceCertificate : Certificate := {
  nodes := [{ formula := P, rule := .modusPonens 0 0 }]
  conclusion := P
}

def mismatchedConclusionCertificate : Certificate := {
  nodes := csCertificate.nodes
  conclusion := dMemberFormula
}

def deadNodeCertificate : Certificate := {
  nodes := repeatedCSCertificate.nodes ++ [{
    formula := cMemberFormula
    rule := .constantSpecification "member-c-k"
  }]
  conclusion := cMemberFormula
}

def outOfRangeReferenceCertificate : Certificate := {
  nodes := [{ formula := P, rule := .modusPonens 99 0 }]
  conclusion := P
}

def forwardReferenceCertificate : Certificate := {
  nodes := [
    { formula := cMemberFormula, rule := .modusPonens 1 2 },
    { formula := .implication cMemberFormula
        (.implication cMemberFormula cMemberFormula),
      rule := .axiom .k },
    { formula := cMemberFormula,
      rule := .constantSpecification "member-c-k" },
    { formula := .implication cMemberFormula cMemberFormula,
      rule := .modusPonens 1 2 },
    { formula := cMemberFormula, rule := .modusPonens 3 0 }
  ]
  conclusion := cMemberFormula
}

def nonImplicationMajorCertificate : Certificate := {
  nodes := [
    { formula := cMemberFormula,
      rule := .constantSpecification "member-c-k" },
    { formula := cMemberFormula, rule := .modusPonens 0 0 }
  ]
  conclusion := cMemberFormula
}

def antecedentMismatchCertificate : Certificate := {
  nodes := [
    { formula := cMemberFormula,
      rule := .constantSpecification "member-c-k" },
    { formula := kAxiom, rule := .axiom .k },
    { formula := .implication Q P, rule := .modusPonens 1 0 }
  ]
  conclusion := .implication Q P
}

def consequentMismatchCertificate : Certificate := {
  nodes := [
    { formula := cMemberFormula,
      rule := .constantSpecification "member-c-k" },
    { formula := .implication cMemberFormula
        (.implication cMemberFormula cMemberFormula),
      rule := .axiom .k },
    { formula := P, rule := .modusPonens 1 0 }
  ]
  conclusion := P
}

def outOfRangeMinorCertificate : Certificate := {
  nodes := [
    { formula := .implication cMemberFormula
        (.implication cMemberFormula cMemberFormula),
      rule := .axiom .k },
    { formula := .implication cMemberFormula cMemberFormula,
      rule := .modusPonens 0 99 }
  ]
  conclusion := .implication cMemberFormula cMemberFormula
}

def correctCSIdWrongFormulaCertificate : Certificate := {
  nodes := [{
    formula := dMemberFormula
    rule := .constantSpecification "member-c-k"
  }]
  conclusion := dMemberFormula
}

def appendixWithoutKRawContext : RawContext := {
  id := "appendix-a-without-k-test-context-v1"
  profileId := AppendixA.metadata.id
  admissions := [
    { id := "admission-formal-proof-policy-v1", formula := AppendixA.premiseP },
    { id := "admission-reviewed-correspondence-v1", formula := AppendixA.premiseA }
  ]
}

theorem appendixWithoutKRawContext_valid :
    appendixWithoutKRawContext.isValid = true := by decide

def appendixWithoutKContext : CheckedContext :=
  ⟨appendixWithoutKRawContext, appendixWithoutKRawContext_valid⟩

def appendixWithoutPRawContext : RawContext := {
  id := "appendix-a-without-p-test-context-v1"
  profileId := AppendixA.metadata.id
  admissions := [
    { id := "admission-kernel-attestation-v1", formula := AppendixA.premiseK },
    { id := "admission-reviewed-correspondence-v1", formula := AppendixA.premiseA }
  ]
}

theorem appendixWithoutPRawContext_valid :
    appendixWithoutPRawContext.isValid = true := by decide

def appendixWithoutPContext : CheckedContext :=
  ⟨appendixWithoutPRawContext, appendixWithoutPRawContext_valid⟩

def appendixWithoutARawContext : RawContext := {
  id := "appendix-a-without-a-test-context-v1"
  profileId := AppendixA.metadata.id
  admissions := [
    { id := "admission-kernel-attestation-v1", formula := AppendixA.premiseK },
    { id := "admission-formal-proof-policy-v1", formula := AppendixA.premiseP }
  ]
}

theorem appendixWithoutARawContext_valid :
    appendixWithoutARawContext.isValid = true := by decide

def appendixWithoutAContext : CheckedContext :=
  ⟨appendixWithoutARawContext, appendixWithoutARawContext_valid⟩

private def expect (label : String) (condition : Bool) : IO Unit :=
  if condition then pure () else throw (IO.userError ("failed: " ++ label))

private def accepted (profile : Profile) (context : CheckedContext)
    (certificate : Certificate) : Bool :=
  (checkCertificate profile context certificate).isSome

private def runTests : IO Unit := do
  expect "K" (accepted j0Profile j0Context (axiomCertificate .k kAxiom))
  expect "S" (accepted j0Profile j0Context (axiomCertificate .s sAxiom))
  expect "ex falso"
    (accepted j0Profile j0Context (axiomCertificate .exFalso exFalsoAxiom))
  expect "double negation"
    (accepted j0Profile j0Context
      (axiomCertificate .doubleNegation doubleNegationAxiom))
  expect "Application"
    (accepted j0Profile j0Context
      (axiomCertificate .application applicationAxiom))
  expect "Sum left"
    (accepted j0Profile j0Context (axiomCertificate .sumLeft sumLeftAxiom))
  expect "Sum right"
    (accepted j0Profile j0Context (axiomCertificate .sumRight sumRightAxiom))
  expect "full-language K substitution"
    (accepted j0Profile j0Context
      (axiomCertificate .k
        (.implication (.reason x P) (.implication Q (.reason x P)))))
  expect "mislabeled profile rejected"
    !(accepted mislabeledProfile mislabeledContext
      (axiomCertificate .k kAxiom))
  expect "near-miss K rejected"
    !(accepted j0Profile j0Context
      (axiomCertificate .k (.implication P (.implication Q Q))))
  expect "near-miss Application rejected"
    !(accepted j0Profile j0Context
      (axiomCertificate .application
        (.implication (.reason x (.implication P Q))
          (.implication (.reason y P) (.reason (.application y x) Q)))))
  expect "Sum is not projection"
    !(accepted j0Profile j0Context
      (axiomCertificate .sumLeft
        (.implication (.reason (.sum x y) P) (.reason x P))))
  expect "variable and constant distinct" !(.variable "x" == Term.constant "x")
  expect "application ordered"
    !(.application x y == Term.application y x)

  expect "finite CS valid" validCSRaw.isValid
  expect "missing CS suffix rejected" !({
    id := "bad-missing-suffix"
    revision := "1"
    members := [{ id := "member-d-c-k", formula := dMemberFormula }]
  } : RawConstantSpecification).isValid
  expect "non-axiom endpoint rejected" !({
    id := "bad-endpoint"
    revision := "1"
    members := [{ id := "member-c-p", formula := .reason (.constant "c") P }]
  } : RawConstantSpecification).isValid
  expect "variable wrapper rejected" !({
    id := "bad-wrapper"
    revision := "1"
    members := [{ id := "member-x-k", formula := .reason x kAxiom }]
  } : RawConstantSpecification).isValid
  expect "duplicate CS formula rejected" !({
    id := "bad-duplicate-formula"
    revision := "1"
    members := [
      { id := "one", formula := cMemberFormula },
      { id := "two", formula := cMemberFormula }
    ]
  } : RawConstantSpecification).isValid
  expect "duplicate CS member id rejected" !({
    id := "bad-duplicate-member-id"
    revision := "1"
    members := [
      { id := "same", formula := cMemberFormula },
      { id := "same", formula := dMemberFormula }
    ]
  } : RawConstantSpecification).isValid
  expect "J0 rejects CS leaf" !(accepted j0Profile j0Context csCertificate)
  expect "J(CS) accepts exact member" (accepted jcsProfile jcsContext csCertificate)
  expect "J0 accepts same formula as premise"
    (accepted j0Profile j0PremiseContext j0PremiseCertificate)
  expect "wrong CS member id rejected"
    !(accepted jcsProfile jcsContext wrongCSMemberCertificate)
  expect "unlisted deeper assertion rejected"
    !(accepted jcsProfile jcsContext unlistedCSCertificate)
  expect "correct CS id with wrong formula rejected"
    !(accepted jcsProfile jcsContext correctCSIdWrongFormulaCertificate)
  match checkCertificate jcsProfile jcsContext repeatedCSCertificate with
  | none => throw (IO.userError "failed: repeated CS certificate")
  | some checked =>
      expect "CS footprint de-duplicates exact member"
        (checked.constantSpecificationFootprint.length == 1)

  expect "empty certificate rejected"
    !(accepted j0Profile j0Context emptyCertificate)
  expect "self reference rejected"
    !(accepted j0Profile j0Context selfReferenceCertificate)
  expect "out-of-range reference rejected"
    !(accepted j0Profile j0Context outOfRangeReferenceCertificate)
  expect "out-of-range minor reference rejected"
    !(accepted jcsProfile jcsContext outOfRangeMinorCertificate)
  expect "in-range forward reference rejected"
    !(accepted jcsProfile jcsContext forwardReferenceCertificate)
  expect "non-implication MP major rejected"
    !(accepted jcsProfile jcsContext nonImplicationMajorCertificate)
  expect "MP antecedent mismatch rejected"
    !(accepted jcsProfile jcsContext antecedentMismatchCertificate)
  expect "MP consequent mismatch rejected"
    !(accepted jcsProfile jcsContext consequentMismatchCertificate)
  expect "conclusion mismatch rejected"
    !(accepted jcsProfile jcsContext mismatchedConclusionCertificate)
  expect "dead nodes rejected"
    !(accepted jcsProfile jcsContext deadNodeCertificate)
  expect "duplicate admission ids rejected" !({
    id := "bad-duplicate-context"
    profileId := j0Metadata.id
    admissions := [
      { id := "same", formula := P },
      { id := "same", formula := Q }
    ]
  } : RawContext).isValid

  expect "Appendix nine-node fixture"
    (accepted AppendixA.profile AppendixA.context AppendixA.certificate)
  expect "Appendix fixture rejects context without k"
    !(accepted AppendixA.profile appendixWithoutKContext AppendixA.certificate)
  expect "Appendix fixture rejects context without p"
    !(accepted AppendixA.profile appendixWithoutPContext AppendixA.certificate)
  expect "Appendix fixture rejects context without a"
    !(accepted AppendixA.profile appendixWithoutAContext AppendixA.certificate)
  expect "Appendix node count" (AppendixA.certificate.nodes.length == 9)
  expect "Appendix empty CS footprint"
    (AppendixA.checkedCertificate.constantSpecificationFootprint == [])
  expect "exact attestation stdout byte length"
    (AppendixA.attestationStdout.toUTF8.size == 551)
  expect "mechanical documentary one-node fixture"
    (accepted AIInteraction.profile AIInteraction.mechanicalContext
      (AIInteraction.certificate AIInteraction.mechanicalRequest))
  expect "mechanical documentary node count"
    ((AIInteraction.certificate AIInteraction.mechanicalRequest).nodes.length == 1)
  expect "documentary premise does not warrant substantive atom"
    (counterEvaluation
        (AIInteraction.conclusion AIInteraction.mechanicalRequest) &&
      !counterEvaluation AIInteraction.mechanicalSubstantiveFormula)
  expect "multibyte fixture response byte length"
    (AIInteraction.mechanicalRawResponse.toUTF8.size == 28)
  expect "multibyte fixture span byte length"
    (AIInteraction.mechanicalRepresentation.toUTF8.size == 9)
  let mechanicalRequestText ← IO.FS.readFile "mechanical_request.json"
  let firstDocumentaryBundle ←
    match AIInteractionBundle.bundleBytesFromText mechanicalRequestText with
    | .ok bytes => pure bytes
    | .error message =>
        throw (IO.userError ("failed: parsed documentary fixture: " ++ message))
  let secondDocumentaryBundle ←
    match AIInteractionBundle.bundleBytesFromText mechanicalRequestText with
    | .ok bytes => pure bytes
    | .error message =>
        throw (IO.userError ("failed: reparsed documentary fixture: " ++ message))
  expect "parsed fixture matches checked documentary value"
    (firstDocumentaryBundle == AIInteractionBundle.mechanicalBundleBytes)
  expect "independent documentary exports are deterministic"
    (firstDocumentaryBundle == secondDocumentaryBundle)
  expect "noncanonical documentary request rejected"
    (match AIInteraction.parseRequest mechanicalRequestText.trimAscii.toString with
      | .error _ => true
      | .ok _ => false)
  expect "deterministic bundle value"
    (appendixBundleBytes == appendixBundleBytes)

#print axioms checkCertificate_sound
#print axioms AppendixA.conclusion_derivable
#print axioms AIInteraction.mechanical_documentary_derivable
#print axioms AIInteraction.documentary_only_not_substantive

end MRW.Justification.Tests

def main : IO UInt32 := do
  try
    MRW.Justification.Tests.runTests
    IO.println "justification tests: passed"
    return 0
  catch error =>
    IO.eprintln error.toString
    return 1
