export default {
  '*.{json,md,css,html}': 'prettier --write',
  'frontend/**/*.{ts,tsx,js,jsx}': [
    'prettier --write',
    'npm --prefix frontend run lint',
  ],
  'backend/**/*.ts': ['prettier --write', 'npm --prefix backend run lint'],
}
