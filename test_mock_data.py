import json

with open("src/calc-extended/solver/ExtendedSolver.js") as f:
    print("Has formulaTrace support in solver?")
    print("formulaTrace" in f.read())
