import { GlyphCountDict, Uint8CountDict } from "./types";
import { LineByLine, NewError, SortObject } from "./utils";

export interface Uint8Sequence {
  Sequence: Uint8Array;
  Label: Uint8Array;
  Dummy: boolean;
}

export interface StringSequence {
  Sequence: string;
  Label: string;
  Dummy: boolean;
}

export class ParsedFASTA {
  //Instead of tracking these as heavy JS objects we just store the raw data in coordinated
  //arrays to improve memory-handling. Saving them as Uint8Arrays saves space in memory
  //and avoids storing them as UTF16.
  private sequence_labels: Uint8Array[];
  private sequences: Uint8Array[];
  public ConsensusSequence: Uint8Array;
  public ConsensusScores: Float32Array;
  private dummy: boolean[];
  public MaxSequenceLength: number;
  public MaxLabelLength: number;
  public TotalLabelLength: number;
  public GlyphCounts: GlyphCountDict;
  public Error: Error;
  private string_decoder: TextDecoder;
  private string_encoder: TextEncoder;

  constructor(fasta_data: Uint8Array) {
    const reader = new LineByLine(fasta_data);
    this.sequence_labels = [];
    this.sequences = [];
    this.dummy = [];
    this.GlyphCounts = {};
    this.Error = null;
    this.string_encoder = new TextEncoder();
    this.string_decoder = new TextDecoder();

    this.MaxSequenceLength = -1;
    this.MaxLabelLength = -1;
    this.TotalLabelLength = 0;
    var current_label = "";
    var sequence_buffer = "";

    //Create dummy sequence to later hold consensus sequence
    this.sequence_labels.push(this.string_encoder.encode("Consensus"));
    this.sequences.push(this.string_encoder.encode(""));

    var header_found = false;
    while (reader.Next()) {
      const line = reader.String();
      if (line.trim().length == 0) {
        continue;
      }
      if (line[0] == ">") {
        header_found = true;
        if (sequence_buffer != "") {
          //Check for > which marks the start of a label
          this.sequence_labels.push(this.string_encoder.encode(current_label));
          this.sequences.push(this.string_encoder.encode(sequence_buffer));
          for (var i = 0; i < sequence_buffer.length; i++) {
            if (!(sequence_buffer[i] in this.GlyphCounts)) {
              this.GlyphCounts[sequence_buffer[i]] = 0;
            }
            this.GlyphCounts[sequence_buffer[i]] += 1;
          }
          this.dummy.push(false);

          if (sequence_buffer.length > this.MaxSequenceLength) {
            this.MaxSequenceLength = sequence_buffer.length;
          }
          this.TotalLabelLength += current_label.length;
          if (current_label.length > this.MaxLabelLength) {
            this.MaxLabelLength = current_label.length;
          }
        }

        current_label = line.slice(1);
        sequence_buffer = "";
      } else {
        sequence_buffer += line;
      }
    }

    //Catch final sequence
    if (sequence_buffer != "") {
      this.sequence_labels.push(this.string_encoder.encode(current_label));
      this.sequences.push(this.string_encoder.encode(sequence_buffer));
      for (var i = 0; i < sequence_buffer.length; i++) {
        if (!(sequence_buffer[i] in this.GlyphCounts)) {
          this.GlyphCounts[sequence_buffer[i]] = 0;
        }
        this.GlyphCounts[sequence_buffer[i]] += 1;
      }
      this.dummy.push(false);

      if (sequence_buffer.length > this.MaxSequenceLength) {
        this.MaxSequenceLength = sequence_buffer.length;
      }
      this.TotalLabelLength += current_label.length;
      if (current_label.length > this.MaxLabelLength) {
        this.MaxLabelLength = current_label.length;
      }
    }

    if (!header_found) {
      this.Error = NewError(
        "FASTA Parsing Error",
        "No sequence labels found in the FASTA file."
      );
    }

    //Compute consensus
    const consensus_buffer = new Uint8Array(this.MaxSequenceLength);
    const score_buffer = new Float32Array(this.MaxSequenceLength);
    for (var x = 0; x < consensus_buffer.length; x++) {
      consensus_buffer[x] = 45; //Fill with gaps (-)
    }

    for (var x = 0; x < this.MaxSequenceLength; x++) {
      //Count column glyphs
      const uint8_count_dict: Uint8CountDict = {};
      for (var y = 1; y < this.sequences.length; y++) {
        if (x < this.sequences[y].length) {
          const glyph = this.sequences[y][x];
          //Skip -
          if (glyph == 45) {
            continue;
          }
          //Skip spaces
          if (glyph == 32) {
            continue;
          }
          if (glyph in uint8_count_dict) {
            uint8_count_dict[glyph] += 1;
          } else {
            uint8_count_dict[glyph] = 1;
          }
        }
      }

      //Pull out maximum
      const sorted_results = SortObject(uint8_count_dict);
      if (sorted_results.length == 0) {
        continue;
      }
      sorted_results.reverse();
      const first = sorted_results[0];
      //WARNING! The code below subtracts 1 from the sequence length because
      //currently the first sequence is always the consensus sequence.
      //If that behavior changes in the future this will need to modified!
      score_buffer[x] = first[1] / (this.sequences.length - 1);
      if (sorted_results.length >= 2) {
        const second = sorted_results[1];
        //If there's a tie then we decide there is no consensus
        if (first[1] == second[1]) {
          consensus_buffer[x] = 43; //+
        } else {
          consensus_buffer[x] = first[0];
        }
      } else {
        consensus_buffer[x] = first[0];
      }
    }

    //Save to first position in sequence data and public properties
    this.sequences[0] = consensus_buffer;
    this.ConsensusSequence = consensus_buffer;
    this.ConsensusScores = score_buffer;
  }

  public SequenceCount(): number {
    return this.sequences.length;
  }

  public GetUint8Sequence(index: number): Uint8Sequence {
    return {
      Sequence: this.sequences[index],
      Label: this.sequence_labels[index],
      Dummy: this.dummy[index],
    };
  }

  public AddUint8Sequence(seq: Uint8Sequence) {
    this.sequences.push(seq.Sequence);
    this.sequence_labels.push(seq.Label);
    this.dummy.push(seq.Dummy);
  }

  public SetUint8Sequence(index: number, seq: Uint8Sequence) {
    this.sequences[index] = seq.Sequence;
    this.sequence_labels[index] = seq.Label;
    this.dummy[index] = seq.Dummy;
  }

  public GetStringLabel(index: number): string {
    return this.string_decoder.decode(this.sequence_labels[index]);
  }

  public GetStringSequence(index: number): StringSequence {
    return {
      Sequence: this.string_decoder.decode(this.sequences[index]),
      Label: this.string_decoder.decode(this.sequence_labels[index]),
      Dummy: this.dummy[index],
    };
  }
}
