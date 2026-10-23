// Whether the dev option tints every globe by country group. Kept in memory
// only, so a reload turns it off. Globes read it when they are created; the
// dev menu remounts the current screen after changing it.
let areGroupsShown = false

export function areCountryGroupsShown(): boolean {
  return areGroupsShown
}

export function setCountryGroupsShown(shown: boolean) {
  areGroupsShown = shown
}
