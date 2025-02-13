import { Model } from "sequelize";

export class PeopleAction extends Model {
  declare id: number;
  declare action: string;
  declare peopleId: number;
  declare agentId: number;
  declare likelihood: number;
}
