import * as net from 'net';
import telnet_client from 'telnet-client';
import { Logging, CharacteristicValue } from 'homebridge';

const serverControllerPort = 10102

export class CoolMasterController {
  private serverController: telnet_client;
  private readonly log: Logging;
  private readonly ipaddress: string;
  private quedCommands: [string, ((value: string) => void)][];

  constructor(
    log: Logging, ipaddress: string
  ) {
    this.log = log;
    this.ipaddress = ipaddress;
    this.quedCommands = [];
    const socket = new net.Socket();
    socket.setEncoding("ascii");
    this.serverController = new telnet_client();
    this.log.info("Connecting to CoolMaster Controller at ", ipaddress);
    this.serverControllerConnect();

    setTimeout(this.runQuededCommands.bind(this), 50);
  }

  async serverControllerConnect() {
    await this.serverController.connect({ host: this.ipaddress, port: serverControllerPort, shellPrompt: '>', echoLines: 0, timeout: 1500 });
  }

  private parseCommandResult(data: string) : string {
    return data.split('\n')[0];
  }

  async runQuededCommands() {
    if (this.quedCommands.length !== 0) {
      const result = await this.serverController.exec(this.quedCommands[0][0]);
      this.log.debug(`command ${this.quedCommands[0][0]}, result ${result}`);

      this.quedCommands[0][1](this.parseCommandResult(result));

      this.quedCommands.shift();
    }
    if (this.quedCommands.length !== 0) {
      setTimeout(this.runQuededCommands.bind(this), 0);
    } else {
      setTimeout(this.runQuededCommands.bind(this), 50);
    }
  }

  async serverControllerQueueCommand(data: string): Promise<string> {
    return new Promise((resolve) => {
      this.quedCommands.push([data, resolve]);
    });
  }

  async GetPowerState(uid: string): Promise<Number> {
    const data = await this.serverControllerQueueCommand(`query ${uid} o\n`);
    return Number(data);
  }


  async SetPowerState(uid: string, value: CharacteristicValue) {
    await this.serverControllerQueueCommand(`${(value ? 'on' : 'off')} ${uid}\n`)
  }

  async SetCoolState(uid: string) {
    await this.serverControllerQueueCommand(`cool ${uid}\n`);
  }

  async SetHeatState(uid: string) {
    await this.serverControllerQueueCommand(`heat ${uid}\n`);
  }

  async GetTemperatureModeState(uid: string) {
    const data = await this.serverControllerQueueCommand(`query ${uid} m\n`);
    return Number(data);
  }

  async GetTargetTemperatureState(uid: string) {
    const data = await this.serverControllerQueueCommand(`query ${uid} h\n`);
    return Number(data);
  }

  async SetTargetTemperatureState(uid: string, value: Number) {
    await this.serverControllerQueueCommand(`temp ${uid} ${value}\n`);
  }

  private parseL2State(data: string) {
    this.log.debug(`parsing data: ${data}`);
    const output = data.split(' ');

    return { "id": output[0].split('.')[1], "onOff": output[1], "temperature": output[2].slice(0, 4), "roomTemperature": output[3].slice(0, 4), "FanMode": output[4], "mode": output[5] };
  }

  async GetLs2State(uid: string) {
    const data = await this.serverControllerQueueCommand(`ls2 ${uid}\n`);
    return this.parseL2State(data)
  }
}
