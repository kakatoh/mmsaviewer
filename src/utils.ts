//Class for parsing a file line by line while also trimming carriage returns
//similar to the way the Go bufio.Scanner behaves
export class LineByLine {
  private file_buffer: Uint8Array;
  private file_buffer_index: number;
  private line_start_index: number;
  private line_end_index: number;

  constructor(file_buffer: Uint8Array) {
    this.file_buffer = file_buffer;
    this.file_buffer_index = 0;
    this.line_start_index = 0;
    this.line_end_index = 0;
  }

  public Next(): boolean {
    //Reset line info
    this.line_start_index = this.file_buffer_index;
    this.line_end_index = this.file_buffer_index;

    while (true) {
      //Check if we're at EOF
      if (this.file_buffer_index >= this.file_buffer.length) {
        return false;
      }

      //Get byte at current index
      const current_byte = this.file_buffer[this.file_buffer_index];
      this.file_buffer_index += 1;

      //Check for newline
      if (current_byte == 0x0a) {
        //Trim carriage return
        const last_byte = this.file_buffer[this.line_end_index - 1];
        if (last_byte == 0x0d) {
          this.line_end_index -= 1;
        }

        return true;
      } else {
        this.line_end_index += 1;
      }
    }
  }

  public Bytes(): Uint8Array {
    return this.file_buffer.slice(this.line_start_index, this.line_end_index);
  }

  public String(): string {
    return new TextDecoder().decode(this.Bytes());
  }
}

export function Clamp(num: number, min: number, max: number): number {
  if (num < min) {
    return min;
  }
  if (num > max) {
    return max;
  }
  return num;
}

export function ElementByID(name: string): HTMLElement {
  return document.getElementById(name);
}

export function SetHTMLByID(id: string, html: string): void {
  document.getElementById(id).innerHTML = html;
  return;
}

export function RemoveByID(id: string): void {
  const elem = document.getElementById(id);
  if (elem) {
    elem.remove();
  } else {
    console.log("Element not found:", id);
  }
  return;
}

export function NewError(name: string, message: string): Error {
  return { name: name, message: message };
}

export function SleepRedrawValue(): number {
  return 0.1;
}

export function Sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export function SortObject(object: any): any {
  var sortable = [];
  for (var property in object) {
    sortable.push([property, object[property]]);
  }
  sortable.sort(function (a, b) {
    return a[1] - b[1];
  });
  return sortable;
}
