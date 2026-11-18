// Rewrites src/environments/environment.ts from the deploy's SSM values plus the MapKit JS token. It reads only
// these four names: the deploy env also holds every Infisical /curbside secret, and no other may reach the bundle.
import { writeFileSync } from 'node:fs';

function read(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set`);
    process.exit(1);
  }
  return value;
}

const environment = {
  apiUrl: read('CURBSIDE_API_URL'),
  // SSM holds the bare host.
  cognitoDomain: `https://${read('CURBSIDE_COGNITO_DOMAIN')}`,
  cognitoClientId: read('CURBSIDE_COGNITO_CLIENT_ID'),
  // Public by design (origin-restricted in Apple's dashboard). Optional: without it the site runs map-less.
  mapkitToken: process.env.MAPKIT_JS_TOKEN ?? '',
};

writeFileSync(
  new URL('../src/environments/environment.ts', import.meta.url),
  `export const environment = ${JSON.stringify(environment, null, 2)};\n`,
);
