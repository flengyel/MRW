"""Retired native staging route; preserve older work and refuse before writes."""
raise SystemExit('This preparer used scopes that were not proven disposable. Use prepare-native-host.py to create a new fixture/profile. Existing work was not changed. See docs/NATIVE_TEST_ISOLATION.md.')
