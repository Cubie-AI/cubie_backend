import { Agent } from "./models/agent.js";
import { AgentInfo } from "./models/agentInfo.js";
import { Nonce } from "./models/nonce.js";
import { People } from "./models/people.js";

People.belongsTo(Agent, {
  foreignKey: "agentId",
});

Agent.hasMany(AgentInfo);

AgentInfo.belongsTo(Agent, {
  foreignKey: "agentId",
});
await Agent.sync({});

await People.sync({});
await AgentInfo.sync({});
await Nonce.sync({});
export { Agent, AgentInfo, People };
