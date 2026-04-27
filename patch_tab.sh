# Fix UI warnings to appease the linter without disrupting layout logic

sed -i '/import { getUnitLabel, formatUnit } from '\''..\/utils\/units'\'';/d' src/calc-extended/components/GlobalDebugTab.jsx
