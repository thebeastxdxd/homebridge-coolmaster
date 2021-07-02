import { Service, PlatformAccessory, CharacteristicValue, Logging, HAP } from 'homebridge';
import { CoolMasterController } from './coolmaster-telnet-controller';

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

    this.coolerHeaterService.getCharacteristic(this.hap.Characteristic.RotationSpeed)
      .onGet(this.handleFanSpeedGet.bind(this))
      .onSet(this.handleFanSpeedSet.bind(this));

    this.coolerHeaterService.getCharacteristic(this.hap.Characteristic.TemperatureDisplayUnits)
      .onGet(this.handleTemperatureUnitsGet.bind(this));

  }

  async handleTemperatureUnitsGet() {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered GET TemperatureDisplayUnits`);
    return this.controller.GetTemperatureUnit();
  }

  /**
   * Handle requests to get the current value of the "Active" characteristic
   */
  async handleActiveGet() {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered GET Active`);
    const activeState : Number = await this.controller.GetPowerState(this.accessory.context.device.uniqueId);
    return activeState > 0;
  }

  /**
   * Handle requests to set the "Active" characteristic
   */
  async handleActiveSet(value: CharacteristicValue) {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered SET Active: ${value}`);
    await this.controller.SetPowerState(this.accessory.context.device.uniqueId, value);
  }

  /**
   * Handle requests to get the current value of the "Current Heater-Cooler State" characteristic
   */
  async handleCurrentHeaterCoolerStateGet() {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered GET CurrentHeaterCoolerState`);

    const state = await this.controller.GetLs2State(this.accessory.context.device.uniqueId);

    this.log.debug(`${this.accessory.context.device.displayName} LS2 State: ${state}`);

    if (state.onOff === 'OFF') {
      this.log.debug(`${this.accessory.context.device.displayName} CurrentHeaterCoolerState is INACTIVE`);
      return this.hap.Characteristic.CurrentHeaterCoolerState.INACTIVE;
    } else if (state.mode === 'Heat') {
      this.log.debug(`${this.accessory.context.device.displayName} CurrentHeaterCoolerState is HEATING`);
      return this.hap.Characteristic.CurrentHeaterCoolerState.HEATING;
    } else {
      this.log.debug(`${this.accessory.context.device.displayName} CurrentHeaterCoolerState is COOLING`);
      return this.hap.Characteristic.CurrentHeaterCoolerState.COOLING;
    }
  }


  /**
   * Handle requests to get the current value of the "Target Heater-Cooler State" characteristic
   */
  async handleTargetHeaterCoolerStateGet() {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered GET TargetHeaterCoolerState`);

    const stateMode = await this.controller.GetTemperatureModeState(this.accessory.context.device.uniqueId);
    let currentValue: number = this.hap.Characteristic.TargetHeaterCoolerState.COOL;

    switch (stateMode) {
      case 0:
      case 3:
        this.log.debug(`${this.accessory.context.device.displayName} TargetHeaterCoolerState is COOL`);
        currentValue = this.hap.Characteristic.TargetHeaterCoolerState.COOL;
        break;
      case 1:
        this.log.debug(`${this.accessory.context.device.displayName} TargetHeaterCoolerState is HEAT`);
        currentValue = this.hap.Characteristic.TargetHeaterCoolerState.HEAT;
        break;
    }

    return currentValue;
  }

  /**
   * Handle requests to set the "Target Heater-Cooler State" characteristic
   */
  async handleTargetHeaterCoolerStateSet(value: CharacteristicValue) {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered SET TargetHeaterCoolerState: ${value}`);

    let targetTemp;
    switch (value) {
      case this.hap.Characteristic.TargetHeaterCoolerState.COOL:
        await this.controller.SetCoolState(this.accessory.context.device.uniqueId);
        targetTemp = await this.controller.GetTargetTemperatureState(this.accessory.context.device.uniqueId) as CharacteristicValue;
        this.log.debug(`${this.accessory.context.device.displayName} CoolingThresholdTemperature is ${targetTemp}`);
        this.coolerHeaterService.updateCharacteristic(this.hap.Characteristic.CoolingThresholdTemperature, targetTemp);
        break;
      case this.hap.Characteristic.TargetHeaterCoolerState.HEAT:
        await this.controller.SetHeatState(this.accessory.context.device.uniqueId);
        targetTemp = await this.controller.GetTargetTemperatureState(this.accessory.context.device.uniqueId) as CharacteristicValue;
        this.log.debug(`${this.accessory.context.device.displayName} HeatingThersholdTemperature is ${targetTemp}`);
        this.coolerHeaterService.updateCharacteristic(this.hap.Characteristic.HeatingThresholdTemperature, targetTemp);
        break;
    }
  }

  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  async handleCurrentTemperatureGet() {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered GET CurrentTemperature`);

    const state = await this.controller.GetLs2State(this.accessory.context.device.uniqueId);

    this.log.debug(`${this.accessory.context.device.displayName} CurrentTemperature is ${Number(state.roomTemperature)}`);

    return Number(state.roomTemperature);
  }

  async handleThresholdTemperatureGet() {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered GET ThresholdTemperature`);

    const targetTemp = await this.controller.GetTargetTemperatureState(this.accessory.context.device.uniqueId) as CharacteristicValue;

    this.log.debug(`${this.accessory.context.device.displayName} ThresholdTemperature is  ${targetTemp}`);

    return targetTemp;
  }

  async handleThresholdTemperatureSet(value: CharacteristicValue) {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered SET ThresholdTemperature: ${value}`);
    await this.controller.SetTargetTemperatureState(this.accessory.context.device.uniqueId, value as Number);

  }

  async handleFanSpeedGet() {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered GET Rotation(Fan) Speed`);
    const fanSpeed = await this.controller.GetFanSpeed(this.accessory.context.device.uniqueId);

    let fanSpeedValue :CharacteristicValue = 0.0;
    switch (fanSpeed) {
      case 0:
        fanSpeedValue = 25.0;
        break;
      case 1: 
        fanSpeedValue = 50.0;
        break;
      case 2:
        fanSpeedValue = 75.0;
        break;
      case 3:
        // this is Auto so i can't really know the speed
        fanSpeedValue = 75.0;
        break;
      case 4:
        fanSpeedValue = 100.0;
        break;
      default:
        this.log.info("invalid value");
    }

    return fanSpeedValue;

  }

  async handleFanSpeedSet(value: CharacteristicValue) {
    this.log.debug(`${this.accessory.context.device.displayName} Triggered SET Rotation(Fan) Speed: ${value}`);
    let fanSpeedMode = "a";
    if (value <= 25.0) {
      fanSpeedMode = "l";
    } else if (value <= 50.0) {
      fanSpeedMode = "m";
    } else if (value < 75.0) {
      fanSpeedMode = "h";
    } else if (value == 75.0) {
      fanSpeedMode = "a";
    } else if (value <= 100.0) {
      fanSpeedMode = "t";
    }

    await this.controller.SetFanSpeed(this.accessory.context.device.uniqueId, fanSpeedMode);
  }

}
