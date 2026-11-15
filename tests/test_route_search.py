from __future__ import annotations

import json
from pathlib import Path
import subprocess
import tomllib
import unittest

ROOT = Path(__file__).resolve().parents[1]
EXECUTABLE = ROOT / "lean/.lake/routes-build/bin/route_tests"


class RouteSearchTests(unittest.TestCase):
    def test_optional_profile_keeps_pinned_checker_build_separate(self) -> None:
        base = tomllib.loads((ROOT / "lean/lakefile.toml").read_text())
        routes = tomllib.loads((ROOT / "lean/lakefile-routes.toml").read_text())
        self.assertNotIn("buildDir", base)
        self.assertEqual(routes["buildDir"], ".lake/routes-build")
        self.assertEqual(routes["testDriver"], "route_tests")
        self.assertNotIn("route_tests", base["defaultTargets"])
        self.assertTrue(routes["leanOptions"]["warningAsError"])

    @unittest.skipUnless(EXECUTABLE.is_file(), "Build the optional Lean route-search profile first")
    def test_checked_alternatives_and_withdrawal_in_fresh_processes(self) -> None:
        reports = []
        for _ in range(2):
            result = subprocess.run([str(EXECUTABLE)], capture_output=True, text=True,
                                    timeout=30, check=True)
            self.assertEqual(result.stderr, "")
            report = json.loads(result.stdout)
            self.assertEqual(report["original_routes"], 2)
            self.assertEqual(report["successor_routes"], 1)
            self.assertGreaterEqual(len(report["checks"]), 28)
            self.assertTrue(all(row["passed"] for row in report["checks"]))
            self.assertEqual(len({row["check"] for row in report["checks"]}), len(report["checks"]))
            reports.append(report)
        self.assertEqual(reports[0], reports[1])


if __name__ == "__main__":
    unittest.main()
