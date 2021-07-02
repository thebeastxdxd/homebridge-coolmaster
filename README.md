# CoolMaster Telnet Plugin
This plugin is a fork from `artnavsegda`'s plugin.
I changed the plugin to be Telnet based instead of based on HTTP. My home controller didn't have http.
I also added some more capabilities like: Fan speed and temperature units.

The configuration looks like this:
```
{
    "platform": "CoolMasterTelnet",
    "ip": "10.0.3.130",
    "accessories": [
        {
            "displayName": "AC 1",
            "uniqueId": "001"
        },
        {
            "displayName": "AC 2",
            "uniqueId": "002"
        },
        {
            "displayName": "AC 3",
            "uniqueId": "003"
        },
    ]
}
```

Have fun! If you have any questions go ahead and ask!
