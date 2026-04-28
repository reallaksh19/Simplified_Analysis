with open('src/calc-extended/components/Bundle2DSolverView.jsx', 'r') as f:
    content = f.read()

# Add FormulaTracePanel component

formula_trace_panel = """
const FormulaTracePanel = ({ formulaTrace = [] }) => {
  const [open, setOpen] = React.useState(false);
  if (!formulaTrace.length) return null;
  return (
    <div style={{ marginTop: '1rem', border: '1px solid #1e3a5f', borderRadius: '6px' }}>
      <button onClick={() => setOpen(!open)}
              style={{ width: '100%', padding: '8px 12px', background: '#0f1a2e',
                       color: '#94a3b8', textAlign: 'left', fontSize: '0.8rem', cursor: 'pointer', border: 'none', borderBottom: open ? '1px solid #1e3a5f' : 'none' }}>
        {open ? '▾' : '▸'} Calculation Trace ({formulaTrace.length} steps)
      </button>
      {open && (
        <div style={{ padding: '8px 12px', maxHeight: '400px', overflowY: 'auto' }}>
          {formulaTrace.map((step, i) => (
            <div key={i} style={{ marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
              <div style={{ color: '#60a5fa', fontSize: '0.75rem', fontWeight: 'bold' }}>
                {step.name}
              </div>
              <div style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '2px' }}>
                {step.expression}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '4px' }}>
                {Object.entries(step.values || {}).map(([k, v]) => (
                  <span key={k} style={{ marginRight: '1rem' }}>
                    {k} = {typeof v === 'object' ? JSON.stringify(v) : (typeof v === 'number' ? v.toFixed(4) : String(v))}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
"""

# inject this after Schematics2D

search = """export default function Bundle2DSolverView() {"""
content = content.replace(search, formula_trace_panel + "\n" + search)

# inject where it says evaluation results, we also add the new component underneath the table

table_end = """                    </tbody>
                  </table>
                </div>
              )}
           </div>
        </div>
    </div>
  );
}"""


table_end_replace = """                    </tbody>
                  </table>
                  <FormulaTracePanel formulaTrace={results.formulaTrace || []} />
                </div>
              )}
           </div>
        </div>
    </div>
  );
}"""

content = content.replace(table_end, table_end_replace)

ratio_bar = """
const RatioBar = ({ ratio }) => {
  const pct = Math.min((ratio || 0) * 100, 120);
  const color = ratio > 1.0 ? '#ef4444' : ratio > 0.95 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ position: 'relative', height: '6px', background: '#1e293b',
                  borderRadius: '3px', width: '80px', display: 'inline-block' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${Math.min(pct, 100)}%`, background: color,
                    borderRadius: '3px', transition: 'width 0.3s' }} />
      {ratio > 1.0 && (
        <div style={{ position: 'absolute', left: '100%', top: 0, height: '100%',
                      width: `${pct - 100}%`, background: '#7f1d1d', borderRadius: '0 3px 3px 0' }} />
      )}
    </div>
  );
};
"""

content = content.replace(formula_trace_panel, ratio_bar + "\n" + formula_trace_panel)

status_badge = """                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px' }}>
                              <span style={styles.statusBadge(row.status === 'PASS')}>{row.status}</span>
                            </td>"""

status_badge_replace = """                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={styles.statusBadge(row.status === 'PASS')}>{row.status}</span>
                                {row.ratio != null && <RatioBar ratio={row.ratio} />}
                              </div>
                            </td>"""

content = content.replace(status_badge, status_badge_replace)

content = "/* AGENT HANDOFF: 3-UI -> 4-QA\n * Date: 2026-04-27\n * Changes:\n *   - src/calc-extended/components/Bundle2DSolverView.jsx: Added FormulaTracePanel and RatioBar\n * Interface changes:\n *   - Added RatioBar and FormulaTracePanel components\n * Known open items:\n *   - None\n * Tests run:\n *   - npm run test, npm run lint\n */\n" + content

with open('src/calc-extended/components/Bundle2DSolverView.jsx', 'w') as f:
    f.write(content)
