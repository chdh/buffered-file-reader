// This test program uses random values to verify the integrity of the buffered-file-reader package.

import * as Fs from "node:fs/promises";
import {Reader} from "buffered-file-reader";

const maxFileLen             = 256000;
const maxBufferSize          = 0x1000;

function assert (cond: boolean) : asserts cond {
   if (!cond) {
      throw new Error("Assertion failed."); }}

function getRandomInt (min: number, max: number) : number {
   return min + Math.floor(Math.random() * (max - min + 1)); }

function genFileDataByte (filePos: number) : number {
   return 1 + filePos % 255; }                             // module 255 is used instead of modulo 256 to introduce a bit of irregularity

function genFileData (buf: Buffer, len: number, filePos: number) {
   for (let p = 0; p < len; p++) {
      buf[p] = genFileDataByte(filePos + p); }}

function verifyFileData (buf: Buffer, len: number, filePos: number) {
   for (let p = 0; p < len; p++) {
      const b1 = buf[p];
      const b2 = genFileDataByte(filePos + p);
      if (b1 != b2) {
         throw new Error(`Data is not equal at file position ${filePos + p}.`); }}}

async function createFile (scratchFileName: string, fileLen: number) {
   const fh = await Fs.open(scratchFileName, "w");
   const blockLen = Math.min(0x4000, fileLen);
   const blockBuf = Buffer.allocUnsafe(blockLen);
   let blockFilePos = 0;
   while (blockFilePos < fileLen) {
      const blockDataLen = Math.min(blockLen, fileLen - blockFilePos);
      genFileData(blockBuf, blockDataLen, blockFilePos);
      const r = await fh.write(blockBuf, 0, blockDataLen);
      assert(r.bytesWritten == blockDataLen);
      blockFilePos += blockDataLen; }
   await fh.close(); }

async function testFileReading (scratchFileName: string, fileLen: number) {
   const bufferSize = getRandomInt(32, maxBufferSize);
   const maxRecordSize = Math.floor(bufferSize / 2);
   const reader = await Reader.open(scratchFileName, {bufferSize});
   while (true) {
      const reqLen = getRandomInt(0, maxRecordSize);
      const buf = await reader.get(reqLen);
      if (!buf) {
         assert(reader.filePosition == fileLen);
         break; }
      const remLen = fileLen - reader.filePosition;
      if (remLen < reqLen) {
         assert(buf.length == remLen); }
       else {
         assert(buf.length >= reqLen); }
      const dataLen = getRandomInt(0, buf.length);
      verifyFileData(buf, dataLen, reader.filePosition);
      reader.advance(dataLen); }
   await reader.close(); }

async function testWithNewFile (scratchFileName: string) {
   const fileLen = getRandomInt(0, maxFileLen);
   await createFile(scratchFileName, fileLen);
   process.stdout.write("W");
   for (let i = 0; i < 1000; i++) {
      await testFileReading(scratchFileName, fileLen);
      process.stdout.write("r"); }
   process.stdout.write("\n"); }

async function main() {
   const args = process.argv.slice(2);
   if (args.length != 1) {
      throw new Error("Invalid number of command line parameters."); }
   const scratchFileName = args[0];
   console.log("Random test started.");
   for (let i = 0; i < 10; i++) {
      await testWithNewFile(scratchFileName); }
   await createFile(scratchFileName, 123456);
   await Fs.unlink(scratchFileName);
   console.log("Random test completed."); }

void main();
