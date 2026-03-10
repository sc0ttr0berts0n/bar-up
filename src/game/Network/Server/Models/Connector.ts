import type { UUID } from "../../Communicator/Communicator";

export class Connector {
  private _uuid: UUID;

  constructor(uuid: UUID) {
    this._uuid = uuid;
  }

  get uuid() {
    return this._uuid;
  }
}
