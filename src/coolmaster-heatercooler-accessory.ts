import { Service, PlatformAccessory, CharacteristicValue, Logging, HAP } from 'homebridge';
import { CoolMasterController } from './coolmaster-putty-controller';

export class CoolMasterPlatformAccessory {

  private readonly log: Logging;
  private hap: HAP;
  private controller: CoolMasterController;

  private coolerHeaterService: Service;
  private readonly accessory: PlatformAccessory;

  constructor(
    hap: HAP, log: Logging, accessory: PlatformAccessory, controller: CoolMasterController
  ) {
    this.log = log;
    this.hap = hap;
    this.accessory = accessory;
    this.controller = controller;

    // get the HeaterCooler service if it exists, otherwise create a new HeaterCooler service
    // you can create multiple services for each accessory
    this.coolerHeaterService = this.accessory.getService(this.hap.Service.HeaterCooler)
      || this.accessory.addService(this.hap.Service.HeaterCooler);

    // set accessory information
    this.accessory.getService(this.hap.Service.AccessoryInformation)!
      .setCharacteristic(this.hap.Characteristic.Manufacturer, 'CoolMaster')
      .setCharacteristic(this.hap.Characteristic.Model, 'AC')
      .setCharacteristic(this.hap.Characteristic.SerialNumber, 'Default-Serial');

    this.addHeaterCoolerService();
  }

  addHeaterCoolerService() {


    this.coolerHeaterService.setCharacteristic(this.hap.Characteristic.Name, this.accessory.context.device.displayName);

    this.coolerHeaterService.getCharacteristic(this.hap.Characteristic.Active)
      .onGet(this.handleActiveGet.bind(this))
      .onSet(this.handleActiveSet.bind(this));

    this.coolerHeaterService.getCharacteristic(this.hap.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.handleCurrentHeaterCoolerStateGet.bind(this));

    this.coolerHeaterService.getCharacteristic(this.hap.Characteristic.TargetHeaterCoolerState)
      .onGet(this.handleTargetHeaterCoolerStateGet.bind(this))
      .onSet(this.handleTargetHeaterCoolerStateSet.bind(this));

    this.coolerHeaterService.getCharacteristic(this.hap.Characteristic.TargetHeaterCoolerState).props.validValues = [1, 2];

    this.coolerHeaterService.getCharacteristic(this.hap.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));

    this.coolerHeaterService.getCharacteristic(this.hap.Characteristic.CoolingThresholdTemperature)
      .onGet(this.handleThresholdTemperatureGet.bind(this))
      .onSet(this.handleThresholdTemperatureSet.bind(this));

    this.coolerHeaterService.getCharacteristic(this.hap.Characteristic.CoolingThresholdTemperature).props.minValue = 16;

    this.coolerHeaterService.getCharacteristic(this.hap.Characteristic.HeatingThresholdTemperature)
      .onGet(this.handleThresholdTemperatureGet.bind(this))
      .onSet(this.handleThresholdTemperatureSet.bind(this));

    this.coolerHeaterService.getCharacteristic(this.hap.Characteristic.HeatingThresholdTemperature).props.minValue = 10;

  }


  /**
   * Handle requests to get the current value of the "Active" characteristic
   */
  async handleActiveGet() {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered GET Active`);
    const data : Number = await this.controller.serverControllerGetState(this.accessory.context.device.uniqueId);
    return data > 0;
  }

  /**
   * Handle requests to set the "Active" characteristic
   */
  async handleActiveSet(value: CharacteristicValue) {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered SET Active: ${value}`);
    await this.controller.serverControllerSetState(this.accessory.context.device.uniqueId, value);
  }


  /**
   * Handle requests to get the current value of the "Current Heater-Cooler State" characteristic
   */
  async handleCurrentHeaterCoolerStateGet() {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered GET CurrentHeaterCoolerState`);

    // TODO: fix
    const data = ""

    return this.hap.Characteristic.CurrentHeaterCoolerState.INACTIVE;
    /*
    this.log.debug(this.accessory.context.device.displayName + ' LS2 State: ' + JSON.stringify(data.data[0]));

    if (data.data[0].onoff === 'OFF') {
      this.log.debug(this.accessory.context.device.displayName + ' CurrentHeaterCoolerState is INACTIVE');
      return this.hap.Characteristic.CurrentHeaterCoolerState.INACTIVE;
    } else if (data.data[0].mode === 'Heat') {
      this.log.debug(this.accessory.context.device.displayName + ' CurrentHeaterCoolerState is HEATING');
      return this.hap.Characteristic.CurrentHeaterCoolerState.HEATING;
    } else {
      this.log.debug(this.accessory.context.device.displayName + ' CurrentHeaterCoolerState is COOLING');
      return this.hap.Characteristic.CurrentHeaterCoolerState.COOLING;
    }
    */
  }


  /**
   * Handle requests to get the current value of the "Target Heater-Cooler State" characteristic
   */
  async handleTargetHeaterCoolerStateGet() {
    this.log.debug(this.accessory.context.device.displayName + ' Triggered GET TargetHeaterCoolerState');

    // set this to a valid value for TargetHeaterCoolerState
    let currentValue = this.hap.Characteristic.TargetHeaterCoolerState.COOL;

    /*
    const response = await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
      + '/raw?command=query&' + this.accessory.context.device.uniqueId + '&m');
    const data = await response.json();

    switch (Number(data.data[0])) {
      case 0:
      case 3:
        this.log.debug(this.accessory.context.device.displayName + ' TargetHeaterCoolerState is COOL');
        currentValue = this.hap.Characteristic.TargetHeaterCoolerState.COOL;
        break;
      case 1:
        this.log.debug(this.accessory.context.device.displayName + ' TargetHeaterCoolerState is HEAT');
        currentValue = this.hap.Characteristic.TargetHeaterCoolerState.HEAT;
        break;
    }
    */
    return currentValue;
  }

  /**
   * Handle requests to set the "Target Heater-Cooler State" characteristic
   */
  async handleTargetHeaterCoolerStateSet(value: CharacteristicValue) {
    this.log.debug(this.accessory.context.device.displayName + ' Triggered SET TargetHeaterCoolerState:', value);

    let response, data;
    /*
    switch (value) {
      case this.hap.Characteristic.TargetHeaterCoolerState.COOL:
        await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
          + '/raw?command=cool&' + this.accessory.context.device.uniqueId);
        response = await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
          + '/raw?command=query&' + this.accessory.context.device.uniqueId + '&h');
        data = await response.json();
        this.log.debug(this.accessory.context.device.displayName + ' CoolingThresholdTemperature is ' + Number(data.data[0]));
        this.coolerHeaterService.updateCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature, Number(data.data[0]));
        break;
      case this.hap.Characteristic.TargetHeaterCoolerState.HEAT:
        await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
          + '/raw?command=heat&' + this.accessory.context.device.uniqueId);
        response = await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
          + '/raw?command=query&' + this.accessory.context.device.uniqueId + '&h');
        data = await response.json();
        this.log.debug(this.accessory.context.device.displayName + ' HeatingThresholdTemperature is ' + Number(data.data[0]));
        this.coolerHeaterService.updateCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature, Number(data.data[0]));
        break;
    }
    */
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  async handleCurrentTemperatureGet() {
    this.log.debug(this.accessory.context.device.displayName + ' Triggered GET CurrentTemperature');

    /*
    const response = await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
      + '/raw?command=ls2&' + this.accessory.context.device.uniqueId);
    const data = await response.json();

    this.log.debug(this.accessory.context.device.displayName + ' CurrentTemperature is ' + Number(data.data[0].substr(17, 4)));

    return Number(data.data[0].substr(17, 4));
    */
    return 19;
  }

  async handleThresholdTemperatureGet() {
    this.log.debug(this.accessory.context.device.displayName + ' Triggered GET ThresholdTemperature');

    /*
    const response = await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
      + '/raw?command=query&' + this.accessory.context.device.uniqueId + '&h');
    const data = await response.json();

    this.log.debug(this.accessory.context.device.displayName + ' ThresholdTemperature is ' + Number(data.data[0]));

    return Number(data.data[0]);
    */
    return 22;
  }

  async handleThresholdTemperatureSet(value: CharacteristicValue) {
    this.log.debug(this.accessory.context.device.displayName + ' Triggered SET ThresholdTemperature:', value);

    /*
    await this.fetchRetry('http://' + this.platform.config.ip + ':10103/v1.0/device/' + this.platform.config.serial
      + '/raw?command=temp&' + this.accessory.context.device.uniqueId + '&' + value);
      */
  }

}
