import {Reader} from "buffered-file-reader";

const reader = await Reader.open("example1.js");

let buf = await reader.get(4);
console.log("First 4 bytes: ", buf.subarray(0, 4));
console.log("Available bytes in the buffer view: ", buf.length);

reader.advance(100);

buf = await reader.get(1);
console.log("Byte at position 100: ", buf[0]);

await reader.close();
