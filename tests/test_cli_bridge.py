from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from theorem_terminal.cli import main


ROOT = Path(__file__).resolve().parents[1]
MODEL_CALL = ROOT / "tests" / "fixtures" / "mechanical_model_call.json"
ADMISSION_REQUEST = ROOT / "tests" / "fixtures" / "mechanical_admission.json"


class BridgeCliTests(unittest.TestCase):
    def invoke(self, arguments: list[str]) -> tuple[int, str, str]:
        stdout = io.StringIO()
        stderr = io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            status = main(arguments)
        return status, stdout.getvalue(), stderr.getvalue()

    def test_projection_and_admission_do_not_invoke_lean(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            projection = Path(temporary) / "projection.json"
            request = Path(temporary) / "request.json"
            with patch(
                "theorem_terminal.documentary_warrant.subprocess.Popen",
                side_effect=AssertionError("Lean must not run"),
            ):
                status, stdout, stderr = self.invoke(
                    [
                        "project-response",
                        str(MODEL_CALL),
                        "--start-byte",
                        "17",
                        "--end-byte",
                        "26",
                        "--representation-id",
                        "representation-mechanical-span-v1",
                        "--kind",
                        "strategic_hint",
                        "--claim-id",
                        "claim-model-produced-mechanical-fixture-v1",
                        "--output",
                        str(projection),
                    ]
                )
                self.assertEqual(status, 0)
                self.assertIn("Created documentary projection", stdout)
                self.assertEqual(stderr, "")

                status, stdout, stderr = self.invoke(
                    [
                        "admit-documentary",
                        str(projection),
                        "--fixture-id",
                        "ai-documentary-mechanical-fixture-v1",
                        "--context-id",
                        "ai-documentary-mechanical-context-v1",
                        "--admission-id",
                        "admission-ai-documentary-mechanical-v1",
                        "--admitted-by-kind",
                        "named_policy",
                        "--admitted-by-id",
                        "ai-documentary-mechanical-policy-v1",
                        "--at",
                        "2026-09-01T00:00:00Z",
                        "--rationale",
                        "Admit only that this synthetic finalized-call fixture contains the exact span.",
                        "--scope",
                        "Mechanical regression only; no substantive mathematical claim is admitted.",
                        "--derivation-id",
                        "derivation-ai-documentary-mechanical-v1",
                        "--output",
                        str(request),
                    ]
                )
                self.assertEqual(status, 0)
                self.assertIn("explicit documentary admission", stdout)
                self.assertEqual(stderr, "")
            self.assertEqual(request.read_bytes(), ADMISSION_REQUEST.read_bytes())

    def test_artifact_commands_refuse_overwrite(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "projection.json"
            arguments = [
                "project-response",
                str(MODEL_CALL),
                "--start-byte",
                "17",
                "--end-byte",
                "26",
                "--representation-id",
                "representation-mechanical-span-v1",
                "--kind",
                "strategic_hint",
                "--claim-id",
                "claim-model-produced-mechanical-fixture-v1",
                "--output",
                str(output),
            ]
            first_status, _, _ = self.invoke(arguments)
            original = output.read_bytes()
            second_status, stdout, stderr = self.invoke(arguments)

            self.assertEqual(first_status, 0)
            self.assertEqual(second_status, 2)
            self.assertEqual(stdout, "")
            self.assertIn("File exists", stderr)
            self.assertEqual(output.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
