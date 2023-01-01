// This example program extracts lines from a text file.

import {Reader} from "buffered-file-reader";

const maxLineLength = 1024;
const fileName      = "example2.js";                       // the program reads it's own source code

async function readLine (reader) {
   const buf = await reader.get(maxLineLength);
   if (!buf) {                                             // end of file
      return;
   }
   let eolLen = 0;                                         // length of end-of-line mark
   let p = 0;
   while (p < buf.length) {
      if (buf[p] == 0x0a) {                                // LF
         eolLen = 1;
         break;
      }
      if (buf[p] == 0x0d) {                                // CR+LF or CR
         eolLen = (p + 1 < buf.length && buf[p + 1] == 0x0a) ? 2 : 1;
         break;
      }
      p++;
   }
   const s = buf.toString("utf8", 0, p);
   reader.advance(p + eolLen);
   return s;
}

async function main() {
   const reader = await Reader.open(fileName);
   let lineCtr = 0;
   while (true) {
      const s = await readLine(reader);
      if (s === undefined) {                               // end of file
         break;
      }
      lineCtr++;
      console.log(lineCtr + ": " + s);
   }
   await reader.close();
   console.log();
   console.log(lineCtr + " lines read from " + fileName + ".");
}

main();
