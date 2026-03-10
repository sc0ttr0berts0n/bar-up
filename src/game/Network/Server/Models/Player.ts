import type { UUID } from "../../Communicator/Communicator";
import Server from "../Server";
import { Connector } from "./Connector";

export class Player extends Connector {
  private _bartenderNumber: number;

  constructor(uuid: UUID, bartenderNumber: number) {
    super(uuid);
    this._bartenderNumber = bartenderNumber;
  }

  get bartenderNumber() {
    return this._bartenderNumber;
  }

  get bartenderState() {
    return Server.game?.engine.getBartenderByNumber(this._bartenderNumber)
      ?.state;
  }
}
