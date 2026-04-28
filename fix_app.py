with open('src/App.jsx', 'r') as f:
    content = f.read()

search = "import { CalcExtendedTab } from './calc-extended/components/CalcExtendedTab';"
replace = "import CalcExtendedTab from './calc-extended/components/CalcExtendedTab';"
content = content.replace(search, replace)

with open('src/App.jsx', 'w') as f:
    f.write(content)
