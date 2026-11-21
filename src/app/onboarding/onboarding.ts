// Set when the account is made, cleared when the walkthrough ends. Per tab: an invite detour mid-walkthrough
// (join the street, then add your home) has to find its way back, a later visit does not.
const ACTIVE = 'curbside.onboarding';
// The tour shows once per browser.
const TOURED = 'curbside.toured';

export const onboarding = {
  start: () => sessionStorage.setItem(ACTIVE, '1'),
  active: () => sessionStorage.getItem(ACTIVE) === '1',
  finish: () => sessionStorage.removeItem(ACTIVE),
  toured: () => localStorage.getItem(TOURED) === '1',
  markToured: () => localStorage.setItem(TOURED, '1'),
};
