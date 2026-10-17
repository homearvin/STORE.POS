import {DEFAULT_PAPER} from './receipt.js';
// The receipt printer on this device: paper size, auto-print and a Bluetooth connection.
// Like photos, these settings belong to the device (each counter has its own printer), so they never
// enter the store records, backups or the online Sheet.
// Bluetooth works in Chrome on Android and on computers; iPhone browsers and some older printers cannot,
// so the browser's normal Print is always the backup.
const PRINTER_KEY='storepos-printer-v1';
// Bluetooth services used by common 58 mm / 80 mm ESC/POS printers (Chrome only shows services named here).
const PRINTER_SERVICES=['000018f0-0000-1000-8000-00805f9b34fb','e7810a71-73ae-499d-8c15-faa9aef0c3f2','49535343-fe7d-4ae5-8fa9-9fafd205e455','0000ff00-0000-1000-8000-00805f9b34fb','0000fee7-0000-1000-8000-00805f9b34fb','0000ae30-0000-1000-8000-00805f9b34fb'];
const BLE_CHUNK=20;   // bytes per write: the smallest size every Bluetooth printer accepts
let printerDevice=null,printerChannel=null;

export function printerSettings(){const base={paper:DEFAULT_PAPER,autoPrint:false};try{return {...base,...JSON.parse(localStorage.getItem(PRINTER_KEY)||'{}')};}catch{return base;}}
export function savePrinterSettings(settings){try{localStorage.setItem(PRINTER_KEY,JSON.stringify(settings));}catch{}}
export const bluetoothAvailable=()=>!!globalThis.navigator?.bluetooth;
export const printerName=()=>printerDevice?(printerDevice.name||'Bluetooth printer'):'';

async function openChannel(device){const server=await device.gatt.connect();for(const service of await server.getPrimaryServices())for(const c of await service.getCharacteristics())if(c.properties.write||c.properties.writeWithoutResponse)return c;throw Error('This printer did not answer. Turn it off and on, then connect again, or use Print.');}

// Chrome shows its own list of nearby Bluetooth devices; the cashier picks the printer once per visit.
export async function connectPrinter(){if(!bluetoothAvailable())throw Error('This browser cannot use Bluetooth. Use Chrome on Android or a computer, or use Print.');
 const device=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:PRINTER_SERVICES}).catch(err=>{throw err.name==='NotFoundError'?Error('No printer was chosen.'):err;});
 printerChannel=await openChannel(device);printerDevice=device;device.addEventListener('gattserverdisconnected',()=>{printerChannel=null;});return printerName();}
export function forgetPrinter(){try{printerDevice?.gatt.disconnect();}catch{}printerDevice=null;printerChannel=null;}

export async function sendToPrinter(bytes){if(!printerDevice)throw Error('Connect a printer in Settings first.');
 if(!printerChannel||!printerDevice.gatt.connected)printerChannel=await openChannel(printerDevice);
 const withReply=printerChannel.properties.write;   // slower but the printer confirms every piece
 for(let i=0;i<bytes.length;i+=BLE_CHUNK){const part=bytes.slice(i,i+BLE_CHUNK);await (withReply?printerChannel.writeValue(part):printerChannel.writeValueWithoutResponse(part));}}
