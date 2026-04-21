export default {
  flags: {
    newDashboard: true,
    betaSearch: false,
    darkMode: true,
    experimentalEditor: 'v2',
  },
  meta: {
    newDashboard:      { owner: 'alice', addedAt: '2024-01-15', ticket: 'PROJ-42', description: 'New dashboard UI' },
    betaSearch:        { owner: 'bob',   addedAt: '2025-03-01', ticket: 'PROJ-88', description: 'Beta search bar' },
    darkMode:          { owner: 'alice', addedAt: '2023-06-01', description: 'Dark mode toggle' },
    experimentalEditor:{ owner: 'carol', addedAt: '2025-11-10', ticket: 'PROJ-99' },
  },
  expiry: {
    betaSearch: '2025-09-01',
  },
  groups: {
    beta: ['betaSearch', 'experimentalEditor'],
  },
}
