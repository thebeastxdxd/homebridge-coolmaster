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
      .onGet(this.handleCoolingThresholdTemperatureGet.bind(this))
      .onSet(this.handleCoolingThresholdTemperatureSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
      .onGet(this.handleHeatingThresholdTemperatureGet.bind(this))
      .onSet(this.handleHeatingThresholdTemperatureSet.bind(this));

  }

  /**
   * Handle requests to get the current value of the "Active" characteristic
   */
  async handleActiveGet() {
    this.platform.log.debug('Triggered GET Active');

    // set this to a valid value for Active
    //const currentValue = this.platform.Characteristic.Active.INACTIVE;

    const response = await fetch('http://'+ this.platform.config.ip + ':10103/v1.0/device/'+ this.platform.config.serial
     + '/raw?command=query&' + this.accessory.context.device.uniqueId + '&o');
    const data = await response.json();
    return Number(data.data[0]);

    //return currentValue;
  }

  /**
   * Handle requests to set the "Active" characteristic
   */
  async handleActiveSet(value) {
    this.platform.log.debug('Triggered SET Active:', value);

    const response = await fetch('http://'+ this.platform.config.ip + ':10103/v1.0/device/'+ this.platform.config.serial
    + '/raw?command=' + (value ? 'on' : 'off') + '&' + this.accessory.context.device.uniqueId);

    const data = await response.json();
    return data.rc;
  }

  /**
   * Handle requests to get the current value of the "Current Heater-Cooler State" characteristic
   */
  async handleCurrentHeaterCoolerStateGet() {
    this.platform.log.debug('Triggered GET CurrentHeaterCoolerState');

    // set this to a valid value for CurrentHeaterCoolerState
    let currentValue = this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE;

    const response = await fetch('http://'+ this.platform.config.ip + ':10103/v1.0/device/'+ this.platform.config.serial
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

    const response = await fetch('http://'+ this.platform.config.ip + ':10103/v1.0/device/'+ this.platform.config.serial
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
  async handleTargetHeaterCoolerStateSet(value) {
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

    const response = await fetch('http://'+ this.platform.config.ip + ':10103/v1.0/device/'+ this.platform.config.serial
    + '/raw?command=' + command + '&' + this.accessory.context.device.uniqueId);

    const data = await response.json();
    return data.rc;
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  handleCurrentTemperatureGet() {
    this.platform.log.debug('Triggered GET CurrentTemperature');

    // set this to a valid value for CurrentTemperature
    const currentValue = 24;

    return currentValue;
  }

  handleCoolingThresholdTemperatureGet() {
    this.platform.log.debug('Triggered GET CoolingThresholdTemperature');
    const currentValue = 24;

    return currentValue;
  }

  handleCoolingThresholdTemperatureSet(value) {
    this.platform.log.debug('Triggered SET CoolingThresholdTemperature:', value);
  }

  handleHeatingThresholdTemperatureGet() {
    this.platform.log.debug('Triggered GET HeatingThresholdTemperature');
    const currentValue = 24;

    return currentValue;
  }

  handleHeatingThresholdTemperatureSet(value) {
    this.platform.log.debug('Triggered SET HeatingThresholdTemperature:', value);
  }

}
