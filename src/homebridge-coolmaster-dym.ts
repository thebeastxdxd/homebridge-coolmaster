import { API, HAP, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { CoolMasterPlatformAccessory } from './coolmaster-heatercooler-accessory';
import { CoolMasterController } from './coolmaster-putty-controller';


/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
const PLATFORM_NAME = 'CoolMasterHomebridgePlugin';

/**
 * This must match the name of your plugin as defined the package.json
 */
const PLUGIN_NAME = 'homebridge-coolmaster';

let hap: HAP;

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  hap = api.hap;

  api.registerPlatform(PLATFORM_NAME, CoolMasterHomebridgePlatform);
};


interface CoolMasterAccessoryConfig {
  uniqueId: string;
  displayName: string;
}

interface CoolMasterConfig extends PlatformConfig {
  ip: string;
  serial: string;
  accessories: CoolMasterAccessoryConfig[];
}

class CoolMasterHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  private coolMasterController: CoolMasterController; 

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);
    this.coolMasterController = new CoolMasterController(this.log, this.config.ip);


    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  discoverDevices() {

    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of (<CoolMasterConfig>this.config).accessories) {

      const uuid = this.api.hap.uuid.generate(device.uniqueId);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        new CoolMasterPlatformAccessory(hap, this.log, existingAccessory, this.coolMasterController);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.displayName);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.displayName, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new CoolMasterPlatformAccessory(hap, this.log, accessory, this.coolMasterController);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
