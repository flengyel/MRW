import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from mrw.lean_correspondence import collect, status


PIN = "leanprover/lean4:v4.35.0"


class ReaderPreflightTests(unittest.TestCase):
    def test_invalid_names_do_not_start_an_executable(self):
        with patch("mrw.lean_correspondence.process") as run:
            with self.assertRaisesRegex(ValueError, "fully qualified"):
                collect("/missing", "Facts\n#eval IO.println 1", "Test.demo")
            with self.assertRaisesRegex(ValueError, "fully qualified"):
                collect("/missing", "Facts", 'Test.demo"')
            run.assert_not_called()

    def test_missing_toolchain_does_not_invoke_elan_or_lake(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder = Path(temporary).resolve()
            (folder / "lean-toolchain").write_text(PIN + "\n")
            with patch.dict(os.environ, {"ELAN_HOME": str(folder / "no-toolchains")}), patch(
                "mrw.lean_correspondence.process"
            ) as run:
                with self.assertRaisesRegex(ValueError, "Run elan toolchain install"):
                    collect(str(folder), "Facts", "Test.demo")
                run.assert_not_called()


@unittest.skipUnless(os.environ.get("MRW_LEAN_CORRESPONDENCE_TESTS") == "1",
                     "Native Lean correspondence test needs Lean 4.35.0 and bubblewrap temporary overlays")
class LeanFactsNativeTests(unittest.TestCase):
    def test_facts_refuse_stale_transitive_sources_and_record_missing_names(self):
        with tempfile.TemporaryDirectory(prefix="mrw-lean-facts-test-") as temporary:
            folder = Path(temporary).resolve()
            root = folder / "project"
            root.mkdir()
            (root / "Facts").mkdir()
            (root / "lean-toolchain").write_text(PIN + "\n")
            (root / "lakefile.toml").write_text('name = "facts"\n[[lean_lib]]\nname = "Facts"\n')
            dependency = root / "Facts/Shared.lean"
            dependency.write_text("namespace FactTest\ndef Object := Nat\nend FactTest\n")
            source = root / "Facts.lean"
            statement = (
                "theorem demo {α : Type u} ⦃β : Type v⦄ [Inhabited α] "
                "(_n : Object) (x : α) (y : β) : x = x ∧ y = y := by\n  sorry"
            )
            source.write_text("import Facts.Shared\nnamespace FactTest\n" + statement + "\nend FactTest\n")
            toolchain = (Path(os.environ.get("ELAN_HOME", str(Path.home() / ".elan"))) /
                         "toolchains/leanprover--lean4---v4.35.0/bin")
            self.assertTrue((toolchain / "lake").is_file())
            self.run_command(root, "git", "init", "-q")
            self.run_command(root, "git", "add", "lakefile.toml", "lean-toolchain", "Facts.lean", "Facts/Shared.lean")
            self.run_command(root, "git", "-c", "user.name=Fixture", "-c", "user.email=fixture@example.test",
                             "-c", "core.hooksPath=/dev/null", "commit", "-qm", "owned test sources")
            # Only the fixture prepares a build. The production reader never does.
            self.run_command(root, str(toolchain / "lake"), "--no-cache", "build", "+Facts:olean")
            build = root / ".lake/build"

            def build_bytes():
                return {child.relative_to(build): child.read_bytes()
                        for child in build.rglob("*") if child.is_file()}

            before = build_bytes()

            facts = collect(str(root), "Facts", "FactTest.demo")
            self.assertEqual(facts["source_location"]["text"], statement)
            self.assertEqual(facts["axiom_dependencies"], ["sorryAx"])
            self.assertNotIn("sorryAx", {item["name"] for item in facts["direct_dependencies"]})
            self.assertIn("@Eq.", facts["declaration_type"]["explicit"])
            self.assertEqual([row["kind"] for row in facts["signature_hypotheses"]],
                             ["implicit", "strict_implicit", "instance", "explicit", "explicit", "explicit"])
            object_fact = next(row for row in facts["direct_dependencies"] if row["name"] == "FactTest.Object")
            self.assertEqual(object_fact["module"], "Facts.Shared")
            self.assertEqual(object_fact["kind"], "definition")
            self.assertEqual(object_fact["source_location"]["text"], "def Object := Nat")
            self.assertEqual(status(facts), {"state": "current"})

            missing = collect(str(root), "Facts", "FactTest.absent")
            self.assertTrue(missing["missing"])
            self.assertNotIn("declaration_type", missing)

            timestamps = dependency.stat()
            dependency.write_text("namespace FactTest\ndef Object := Int\nend FactTest\n")
            os.utime(dependency, ns=(timestamps.st_atime_ns, timestamps.st_mtime_ns))
            with patch("mrw.lean_correspondence._sandbox") as sandbox:
                self.assertEqual(status(facts), {"state": "changed"})
                sandbox.assert_not_called()
            with self.assertRaisesRegex(ValueError, r"Build the project first \(lake build Facts\)"):
                collect(str(root), "Facts", "FactTest.demo")
            self.assertEqual(build_bytes(), before)

            source.write_text(source.read_text().replace("(_n : Object)", "(_n : Object) (_extra : True)"))
            self.run_command(root, str(toolchain / "lake"), "--no-cache", "--rehash", "build", "+Facts:olean")
            latest = collect(str(root), "Facts", "FactTest.demo")
            self.assertNotEqual(latest["declaration_type"], facts["declaration_type"])
            self.assertIn("(_extra : True)", latest["source_location"]["text"])
            self.assertEqual(facts["source_location"]["text"], statement)

    def run_command(self, root, *arguments):
        completed = subprocess.run(arguments, cwd=root, stdin=subprocess.DEVNULL, capture_output=True,
                                   check=False, timeout=60)
        self.assertEqual(completed.returncode, 0, completed.stderr.decode() + completed.stdout.decode())
