## IKEA Tradfri Webhook

This project is based on [node_tradfri_ifttt](https://github.com/valenting/node_tradfri_ifttt)

Using this project you can control your IKEA lights using simple webhook requests.
   * Have a group called `Living Room`.
   * Name your lightbulbs `Couch 1`, `Couch 2`, `Lamp 1`.
   * The command will try to match the group name exactly.
   * If no match is found, it will apply the action to all bulbs that start with the given argument.

### Getting Started
If you haven't already, install git and node.js on your device.

1. Fork or clone this repository onto your device.
2. In your console, run `npm install` to install the required components.
3. Run `touch .env` to create your hidden, gitignored environment config file.
4. Generate a preshared key for your application by running `node get_key.js`
    * Input the IP to the IKEA Tradfri hub
    * Input the security code printed on the HUB
    * You will get back the identity and psk values to be saved into the .env file
5. In .env, configure your environment as follows:
    * `DEV=`  `TRUE` if you are on desktop, or `FALSE` if you are on your raspberry pi
    * `PORT=` The port that the server will listen on.
    * `PASS=` Whatever you want the password to your API to be
    * `HUBIP=` The IP to your IKEA Tradfri hub
    * `APIUSER=` The user/identity used to the connect to the hub
    * `APIKEY=` The password/psk used to connect to the hub
6. Run `npm start` to launch the server

7. Test your API
* The API has the following structure: `http://[IPADDRESS]:[PORT]/api/:operation/:what/:state?password=[PASS]`
* `[IPADDRESS]` - the internet accessible IP address used to access the API. This is usually the public IP address of your router.
* `[PORT]` - the internet accessible PORT used to access the API. You usually have to forward this from your router to the host running this package.
* `[PASS]` - the password you defined in the .env file
* You can test that it works by making calls with `curl` such as `curl -i -X POST http://[IPADDRESS]:[PORT]/api/turn/all/on?password=[PASS]` (this should turn on all the lights)

8. Run the project at startup:
   * Add a line similar to `cd /home/pi/node_tradfri_ifttt && nohup npm start &` to your `/etc/rc.local`

At `http://[IPADDRESS]:[PORT]/dashboard` there is a dashboard with toggle functionality for each device

## API
### Operations

**turn**
* on
* off
* toggle

**dim**
* dim value 0-100

**temp**
* temp value 0-100

**color**
* Hex color value

## #TODO
* Make a more functional dashboard
* Add testing
