import { Agent } from "./models/agent.js";
import { AgentInfo } from "./models/agentInfo.js";
import { Comment } from "./models/comment.js";
import { Nonce } from "./models/nonce.js";
import { People } from "./models/people.js";
import { PriceHistory } from "./models/priceHistory.js";
import { Token } from "./models/token.js";

People.belongsTo(Agent, {
  foreignKey: "agentId",
});

Agent.hasMany(AgentInfo, {
  foreignKey: "agentId",
  as: "info",
});

AgentInfo.belongsTo(Agent, {
  foreignKey: "agentId",
});

Agent.hasMany(Comment, {
  foreignKey: "agentId",
  as: "comments",
});

Agent.hasMany(PriceHistory, {
  as: "history",
  foreignKey: "agentId",
});

PriceHistory.belongsTo(Agent, {
  foreignKey: "agentId",
});

Comment.belongsTo(Agent, {
  foreignKey: "agentId",
});

// Sync all models
await Agent.sync({});
await People.sync({});
await AgentInfo.sync({});
await Nonce.sync({});
await Comment.sync({});
await PriceHistory.sync({});
await Token.sync({});

// scoped export
export { Agent, AgentInfo, Comment, Nonce, People, PriceHistory, Token };
