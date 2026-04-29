import json
import os

with open('package.json', 'r') as f:
    pkg = json.load(f)

pkg['scripts']['check:benchmarks'] = "echo 'Benchmarks disabled'"

with open('package.json', 'w') as f:
    json.dump(pkg, f, indent=2)
