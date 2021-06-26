import * as net from 'net';
import PromiseSocket from 'promise-socket'
import { Logging, CharacteristicValue } from 'homebridge';

const serverControllerPort = 10102
const serverControllerReadChunkSize = 1500;

export class CoolMasterController {
  private serverController: PromiseSocket<net.Socket>;
  private readonly log: Logging;
  private readonly ipaddress: string;

  constructor(
    log: Logging, ipaddress: string
  ) {
    this.log = log;
    this.ipaddress = ipaddress;
    const socket = new net.Socket();
    socket.setEncoding("ascii");
    this.serverController = new PromiseSocket(socket);
    this.log.info("Connecting to VantageInfusion Controller at ", ipaddress);
    this.serverControllerConnect();
  }

  async serverControllerConnect() {
    // data callback should already be initialized
    const data = await this.serverController.connect({ host: this.ipaddress, port: serverControllerPort });
  }

  async serverControllerSend(data: string) : Promise<string> {
    const written = await this.serverController.write(data);
    const received_data: string | Buffer | undefined = await this.serverController.read(serverControllerReadChunkSize); 
    this.log.debug(`received data ${received_data}`);
    return <string>received_data;
  }

  async serverControllerGetState(uid: string): Promise<Number> {
    const data = await this.serverControllerSend(`query ${uid} o`);
    return Number(data); 
  }


  async serverControllerSetState(uid: string, value: CharacteristicValue) {
    await this.serverControllerSend(`${(value ? 'on' : 'off')} ${uid}`)

  }

  async serverControllerLs2State(uid: string) {
    const data = await this.serverControllerSend(`l2 ${uid}`);
    this.log.debug(data);
    // TODO: parse ls2
    return data;
  }
  /** 
  
    async handleCurrentHeaterCoolerStateGet() {
      this.log.debug(this.accessory.context.device.displayName + ' Triggered GET CurrentHeaterCoolerState');
  
      const response = await fetch('http://' + this.platform.config.ip + ':10103/v2.0/device/' + this.platform.config.serial
        + '/ls2&' + this.accessory.context.device.uniqueId);
      const data = await response.json();
  
      this.log.debug(this.accessory.context.device.displayName + ' LS2 State: ' + JSON.stringify(data.data[0]));
  
      if (data.data[0].onoff === 'OFF') {
        this.log.debug(this.accessory.context.device.displayName + ' CurrentHeaterCoolerState is INACTIVE');
        return this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE;
      } else if (data.data[0].mode === 'Heat') {
        this.log.debug(this.accessory.context.device.displayName + ' CurrentHeaterCoolerState is HEATING');
        return this.platform.Characteristic.CurrentHeaterCoolerState.HEATING;
      } else {
        this.log.debug(this.accessory.context.device.displayName + ' CurrentHeaterCoolerState is COOLING');
        return this.platform.Characteristic.CurrentHeaterCoolerState.COOLING;
      }
    }
  
  
    async handleTargetHeaterCoolerStateGet() {
      this.log.debug(this.accessory.context.device.displayName + ' Triggered GET TargetHeaterCoolerState');
  
      // set this to a valid value for TargetHeaterCoolerState
      let currentValue = this.platform.Characteristic.TargetHeaterCoolerState.COOL;
  
      const response = await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
        + '/raw?command=query&' + this.accessory.context.device.uniqueId + '&m');
      const data = await response.json();
  
      switch (Number(data.data[0])) {
        case 0:
        case 3:
          this.log.debug(this.accessory.context.device.displayName + ' TargetHeaterCoolerState is COOL');
          currentValue = this.platform.Characteristic.TargetHeaterCoolerState.COOL;
          break;
        case 1:
          this.log.debug(this.accessory.context.device.displayName + ' TargetHeaterCoolerState is HEAT');
          currentValue = this.platform.Characteristic.TargetHeaterCoolerState.HEAT;
          break;
      }
  
      return currentValue;
    }
  
  /
    async handleTargetHeaterCoolerStateSet(value: CharacteristicValue) {
      this.log.debug(this.accessory.context.device.displayName + ' Triggered SET TargetHeaterCoolerState:', value);
  
      let response, data;
  
      switch (value) {
        case this.Characteristic.TargetHeaterCoolerState.COOL:
          await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
            + '/raw?command=cool&' + this.accessory.context.device.uniqueId);
          response = await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
            + '/raw?command=query&' + this.accessory.context.device.uniqueId + '&h');
          data = await response.json();
          this.log.debug(this.accessory.context.device.displayName + ' CoolingThresholdTemperature is ' + Number(data.data[0]));
          this.coolerHeaterService.updateCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature, Number(data.data[0]));
          break;
        case this.platform.Characteristic.TargetHeaterCoolerState.HEAT:
          await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
            + '/raw?command=heat&' + this.accessory.context.device.uniqueId);
          response = await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
            + '/raw?command=query&' + this.accessory.context.device.uniqueId + '&h');
          data = await response.json();
          this.log.debug(this.accessory.context.device.displayName + ' HeatingThresholdTemperature is ' + Number(data.data[0]));
          this.coolerHeaterService.updateCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature, Number(data.data[0]));
          break;
      }
    }
  
    async handleCurrentTemperatureGet() {
      this.log.debug(this.accessory.context.device.displayName + ' Triggered GET CurrentTemperature');
  
      const response = await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
        + '/raw?command=ls2&' + this.accessory.context.device.uniqueId);
      const data = await response.json();
  
      this.log.debug(this.accessory.context.device.displayName + ' CurrentTemperature is ' + Number(data.data[0].substr(17, 4)));
  
      return Number(data.data[0].substr(17, 4));
    }
  
    async handleThresholdTemperatureGet() {
      this.log.debug(this.accessory.context.device.displayName + ' Triggered GET ThresholdTemperature');
  
      const response = await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
        + '/raw?command=query&' + this.accessory.context.device.uniqueId + '&h');
      const data = await response.json();
  
      this.log.debug(this.accessory.context.device.displayName + ' ThresholdTemperature is ' + Number(data.data[0]));
  
      return Number(data.data[0]);
    }
  
    async handleThresholdTemperatureSet(value: CharacteristicValue) {
      this.log.debug(this.accessory.context.device.displayName + ' Triggered SET ThresholdTemperature:', value);
  
      await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
        + '/raw?command=temp&' + this.accessory.context.device.uniqueId + '&' + value);
    }
  */
}
