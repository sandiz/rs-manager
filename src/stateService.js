import { getConfig, updateConfig } from "./configService"

export async function saveState(componentID, stateObj) {
  const state = getConfig("state");
  state[componentID] = stateObj
  updateConfig("state", state);
}

export async function getState(componentID) {
  const state = await getConfig("state");
  if (componentID in state) {
    return state[componentID]
  }
  return null;
}
