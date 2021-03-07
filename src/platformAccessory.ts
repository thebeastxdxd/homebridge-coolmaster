import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { CoolMasterHomebridgePlatform } from './platform';
import fetch from 'node-fetch';

export class CoolMasterPlatformAccessory {
  private service: Service;

  constructor(
    private readonly platform: CoolMasterHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.HeaterCooler)
     || this.accessory.addService(this.platform.Service.HeaterCooler);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.handleCurrentHeaterCoolerStateGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .onGet(this.handleTargetHeaterCoolerStateGet.bind(this))
      .onSet(this.handleTargetHeaterCoolerStateSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState).props.validValues = [1, 2];

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
      .onGet(this.handleThresholdTemperatureGet.bind(this))
      .onSet(this.handleThresholdTemperatureSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
      .onGet(this.handleThresholdTemperatureGet.bind(this))
      .onSet(this.handleThresholdTemperatureSet.bind(this));

  }

  fetchRetry(url: string) {
    return fetch(url).then(res => {
      if (res.ok) {
        return res;
      }
      return this.fetchRetry(url);
    })
      .catch(() => {
        return this.fetchRetry(url);
      });
  }

  /**
   * Handle requests to get the current value of the "Active" characteristic
   */
  async handleActiveGet() {
    this.platform.log.debug('Triggered GET Active');

    const response = await this.fetchRetry('http://'+ this.platform.config.ip + ':10103/v1.0/device/'+ this.platform.config.serial
     + '/raw?command=query&' + this.accessory.context.device.uniqueId + '&o');
    const data = await response.json();

    this.platform.log.info('Active is ' + Number(data.data[0]));

    return Number(data.data[0]);
  }

  /**
   * Handle requests to set the "Active" characteristic
   */
  async handleActiveSet(value: CharacteristicValue) {
    this.platform.log.debug('Triggered SET Active:', value);

    await this.fetchRetry('http://'+ this.platform.config.ip + ':10103/v1.0/device/'+ this.platform.config.serial
    + '/raw?command=' + (value ? 'on' : 'off') + '&' + this.accessory.context.device.uniqueId);
  }

  /**
   * Handle requests to get the current value of the "Current Heater-Cooler State" characteristic
   */
  async handleCurrentHeaterCoolerStateGet() {
    this.platform.log.debug('Triggered GET CurrentHeaterCoolerState');

    // set this to a valid value for CurrentHeaterCoolerState
    let currentValue = this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE;

    const response = await this.fetchRetry('http://'+ this.platform.config.ip + ':10103/v1.0/device/'+ this.platform.config.serial
    + '/raw?command=query&' + this.accessory.context.device.uniqueId + '&m');
    const data = await response.json();

    this.platform.log.debug('CurrentHeaterCoolerState is ' + Number(data.data[0]));

    switch (Number(data.data[0])) {
      case 0:
      case 3:
        currentValue = this.platform.Characteristic.CurrentHeaterCoolerState.COOLING;
        break;
      case 1:
        currentValue = this.platform.Characteristic.CurrentHeaterCoolerState.HEATING;
        break;
    }

    return currentValue;
  }


  /**
   * Handle requests to get the current value of the "Target Heater-Cooler State" characteristic
   */
  async handleTargetHeaterCoolerStateGet() {
    this.platform.log.debug('Triggered GET TargetHeaterCoolerState');

    // set this to a valid value for TargetHeaterCoolerState
    let currentValue = this.platform.Characteristic.TargetHeaterCoolerState.COOL;

    const response = await this.fetchRetry('http://'+ this.platform.config.ip + ':10103/v1.0/device/'+ this.platform.config.serial
    + '/raw?command=query&' + this.accessory.context.device.uniqueId + '&m');
    const data = await response.json();

    this.platform.log.debug('CurrentHeaterCoolerState is ' + Number(data.data[0]));

    switch (Number(data.data[0])) {
      case 0:
      case 3:
        currentValue = this.platform.Characteristic.TargetHeaterCoolerState.COOL;
        break;
      case 1:
        currentValue = this.platform.Characteristic.TargetHeaterCoolerState.HEAT;
        break;
    }

    return currentValue;
  }

  /**
   * Handle requests to set the "Target Heater-Cooler State" characteristic
   */
  async handleTargetHeaterCoolerStateSet(value: CharacteristicValue) {
    this.platform.log.debug('Triggered SET TargetHeaterCoolerState:', value);

    let command = 'cool';

    switch (value) {
      case this.platform.Characteristic.TargetHeaterCoolerState.COOL:
        command = 'cool';
        break;
      case this.platform.Characteristic.TargetHeaterCoolerState.HEAT:
        command = 'heat';
        break;
    }

    await this.fetchRetry('http://'+ this.platform.config.ip + ':10103/v1.0/device/'+ this.platform.config.serial
    + '/raw?command=' + command + '&' + this.accessory.context.device.uniqueId);
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  async handleCurrentTemperatureGet() {
    this.platform.log.debug('Triggered GET CurrentTemperature');

    const response = await this.fetchRetry('http://'+ this.platform.config.ip + ':10103/v1.0/device/'+ this.platform.config.serial
     + '/raw?command=ls2&' + this.accessory.context.device.uniqueId);
    const data = await response.json();

    this.platform.log.debug('CurrentTemperature is ' + Number(data.data[0].substr(17, 4)));

    return Number(data.data[0].substr(17, 4));
  }

  async handleThresholdTemperatureGet() {
    this.platform.log.debug('Triggered GET ThresholdTemperature');

    const response = await this.fetchRetry('http://'+ this.platform.config.ip + ':10103/v1.0/device/'+ this.platform.config.serial
     + '/raw?command=query&' + this.accessory.context.device.uniqueId + '&h');
    const data = await response.json();

    this.platform.log.info('ThresholdTemperature is ' + Number(data.data[0]));

    return Number(data.data[0]);
  }

  async handleThresholdTemperatureSet(value: CharacteristicValue) {
    this.platform.log.debug('Triggered SET ThresholdTemperature:', value);

    await this.fetchRetry('http://'+ this.platform.config.ip + ':10103/v1.0/device/'+ this.platform.config.serial
     + '/raw?command=temp&' + this.accessory.context.device.uniqueId + '&' + value);
  }

}
