// Local dev values. The deploy rewrites this file from SSM (scripts/write-environment.mjs).
export const environment = {
  apiUrl: 'https://api.curbside.xomware.com/v1',
  cognitoDomain: 'https://xomware-curbside.auth.us-east-1.amazoncognito.com',
  cognitoClientId: '1aqfq9g4nm92ppr2s0l1kqnc10',
  // MapKit JS token (Infisical MAPKIT_JS_TOKEN at deploy). Empty shows "Map unavailable".
  mapkitToken: '',
};
