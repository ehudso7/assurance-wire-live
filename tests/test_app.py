import unittest

from app import safe


class SafeTests(unittest.TestCase):
    def test_parses_integer(self):
        self.assertEqual(safe("7"), 7)

    def test_rejects_non_integer(self):
        with self.assertRaises(ValueError):
            safe("not-a-number")


if __name__ == "__main__":
    unittest.main()
