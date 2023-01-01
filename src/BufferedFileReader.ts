import * as Fs from "node:fs/promises";

const byteAlignment          = 8;                          // memory alignment for faster file i/o transfers
const defaultBufferSize      = 0x40000;                    // 256 KB
const maxBlockSize           = 0x4000;                     // 16 KB

function assert (cond: boolean) : asserts cond {
   if (!cond) {
      throw new Error("Assertion failed."); }}

export interface OpenOptions {
   bufferSize?:              number;                       // size of the internal buffer
   preallocatedBuffer?:      Buffer; }                     // a pre-allocated buffer to be re-used instead of using bufferSize to allocate a new buffer

export class Reader {

   private fileHandle:       Fs.FileHandle;
   private isOpen:           boolean;
   private buffer:           Buffer;                       // internal buffer
   private bufferEod:        number;                       // offset of end-of-data in buffer
   private bufferFilePos:    number;                       // file position at the start of the buffer
   private currentFilePos:   number;                       // current file position
   private eof:              boolean;                      // true if no more data can be read from the underlying file handle
   private blockSize:        number;                       // block size for reading from the underlying file handle

   public static async open (fileName: string, options?: OpenOptions) : Promise<Reader> {
      const fileHandle = await Fs.open(fileName);
      const reader = new Reader();
      reader.fileHandle = fileHandle;
      reader.isOpen = true;
      const bufferSizeArg = options?.bufferSize || defaultBufferSize;
      reader.buffer = options?.preallocatedBuffer ?? Buffer.allocUnsafe(bufferSizeArg);
      assert(reader.buffer.length >= 2 * byteAlignment);
      reader.bufferEod = 0;
      reader.bufferFilePos = 0;
      reader.currentFilePos = 0;
      reader.eof = false;
      reader.blockSize = Math.min(maxBlockSize, roundDownToPowerOf2(Math.floor(reader.buffer.length / 4)));
      return reader; }

   public async close() : Promise<void> {
      if (!this.isOpen) {
         return; }
      this.isOpen = false;
      await this.fileHandle.close(); }

   public async get (length: number) : Promise<Buffer|undefined> {
      assert(this.isOpen);
      assert(length >= 0);
      assert(this.currentFilePos >= this.bufferFilePos);
      if (length == 0) {
         return Buffer.alloc(0); }
      if (this.currentFilePos + length > this.bufferFilePos + this.bufferEod) {
         await this.loadDataIntoBuffer(); }
      const currentOffs = this.currentFilePos - this.bufferFilePos;
      assert(currentOffs >= 0);
      const availableData = this.bufferEod - currentOffs;
      if (availableData <= 0) {
         assert(this.eof);
         return undefined; }
      return Buffer.from(this.buffer.buffer, this.buffer.byteOffset + currentOffs, availableData); }

   public advance (length: number) {
      assert(length >= 0);
      this.currentFilePos += length; }

   private async loadDataIntoBuffer() : Promise<void> {
      if (this.eof) {
         return; }
      this.moveBufferDataDown();
      while (true) {
         const freeLen = this.buffer.length - this.bufferEod;                                       // size of free space in buffer
         assert(freeLen >= 0);
         if (freeLen == 0) {                                                                        // buffer is full
            return; }
         const readFilePos = this.bufferFilePos + this.bufferEod;                                   // file position for reading
         const blockEndPos = Math.floor((readFilePos + freeLen) / this.blockSize) * this.blockSize; // file position of last possible block boundary
         const blockReadLen = blockEndPos - readFilePos;
         const readLen = blockReadLen > 0 ? blockReadLen : freeLen;
         const r = await this.fileHandle.read(this.buffer, this.bufferEod, readLen, readFilePos);
         assert(r.bytesRead <= readLen);
         if (r.bytesRead <= 0) {
            this.eof = true;
            return; }
         this.bufferEod += r.bytesRead;
         if (r.bytesRead == readLen) {
            return; }}}

   // Moves the data that lies between currentFilePos and bufferEod to the beginning of the buffer.
   private moveBufferDataDown() {
      assert(this.currentFilePos >= this.bufferFilePos);
      const keepOffs = this.currentFilePos - this.bufferFilePos;
      const keepLen = this.bufferEod - keepOffs;
      const alignmentOffs = this.currentFilePos % byteAlignment;
      if (keepLen <= 0) {
         this.bufferFilePos = this.currentFilePos - alignmentOffs;
         this.bufferEod = alignmentOffs;
         return; }
      if (alignmentOffs >= keepOffs) {
         return; }
      this.buffer.copy(this.buffer, alignmentOffs, keepOffs, keepOffs + keepLen);
      this.bufferFilePos = this.currentFilePos - alignmentOffs;
      this.bufferEod = alignmentOffs + keepLen; }

   public get filePosition() : number {
      return this.currentFilePos; }

   }

function roundDownToPowerOf2 (x: number) : number {
   let n = 1;
   while (2 * n <= x) {
      n *= 2; }
   return n; }
