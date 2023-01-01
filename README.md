# buffered-file-reader

A promise-based buffered reader for sequential byte-wise binary file input.

**NPM package**: [buffered-file-reader](https://www.npmjs.com/package/buffered-file-reader)<br>
**Example of how to use it**: [github.com/chdh/buffered-file-reader/tree/main/example](https://github.com/chdh/github.com/chdh/buffered-file-reader/tree/main/example)


## Concept

"Locate mode" is used to access data within the internal data buffer.

Locate mode is a very
[old concept](https://www.google.com/search?q=%22locate+mode%22+ibm)
which was was common in IBM mainframes with PL/I.
It's used to avoid copying file data and to allow fast byte-wise inspection of the data stream.

With the "view" functionality of the Node.js
[Buffer](https://nodejs.org/dist/latest/docs/api/buffer.html)
and JavaScript
[TypedArray](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray)
classes, it's now possible to use this concept in a modern programming environment.


## API

### Reader.open()

```typescript
static Reader.open (fileName: string, options?: OpenOptions) : Promise<Reader>
```

Opens a file and returns a Reader object.

* `fileName`: The name of a file to read from.
* `options`: Optional options (see below).
* Return value: A new Reader object.

```typescript
interface OpenOptions {
  bufferSize?:         number; // size of the internal data buffer, default is to use 256 KB
  preallocatedBuffer?: Buffer; // a pre-allocated buffer to be re-used instead of using bufferSize to allocate a new buffer
}
```

### reader.close()

```typescript
reader.close() : Promise<void>
```

Closes the Reader object and the underlying file handle.


### reader.get()

```typescript
reader.get (length: number) : Promise<Buffer|undefined>
```

Returns a view into the internal data buffer at the current file position.

* `length`:
  Specifies the number of bytes requested.<br>
  If the end of the file is encountered or if there
  is not enough space in the internal buffer, a shorter view is returned.<br>
  If more data is available in the internal data buffer, which is normally the case, a longer view is returned.<br>
  For optimal performance, `length` should be much smaller than the size of the internal data buffer.
* Return value:
  A
  [Buffer](https://nodejs.org/dist/latest/docs/api/buffer.html)
  object whis is a view into the internal data buffer at the current position.<br>
  If the current file position is at the end of the file and no more data is available, `undefined` is returned.

The current file position is not advanced.


### reader.advance()

```typescript
reader.advance (length: number)
```

Advances the current file position.


### reader.filePosition

```typescript
reader.filePosition: number

```

Returns the current file position.


## Example

```typescript
import {Reader} from "buffered-file-reader";

const reader = await Reader.open("test.txt");

let buf = await reader.get(4);
console.log("First 4 bytes: ", buf.subarray(0, 4));
console.log("Available bytes in the buffer view: ", buf.length);

reader.advance(100);

buf = await reader.get(1);
console.log("Byte at position 100: ", buf[0]);

await reader.close();
```
