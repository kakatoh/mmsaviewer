import { CustomWindow } from "../src/types";
import { DoModal, GetTemplateNameFromID, RecoverableError } from "../src/ui";
import { ElementByID, NewError } from "../src/utils";

declare let window: CustomWindow;

export default function (event: MouseEvent): void {
  //Initialize
  const state = window.MAFFTMSAViewer.State;
  if (!state.Initialized) {
    RecoverableError(NewError("Error", "Aligment has not yet been loaded."));
    return;
  }

  //Prepare indices for MSA data
  const top_left = state.MSACurrentTopLeft;
  const bottom_right = state.MSACurrentBottomRight;
  const start_x = Math.round(top_left[0] * state.MSATileMap.TileWidth);
  const end_x = Math.round(bottom_right[0] * state.MSATileMap.TileWidth);
  const start_y = -1.0 * Math.round(top_left[1] * state.MSATileMap.TileHeight);
  const end_y =
    -1.0 * Math.round(bottom_right[1] * state.MSATileMap.TileHeight);

  //Prepare data URI
  const data_uri_header = "data:text/plain,";
  let split_data = [];
  for (let y = start_y; y < end_y; y++) {
    const seq = state.Sequences.GetStringSequence(y);
    const trimmed_seq = seq.Sequence.slice(start_x, end_x);
    split_data.push(`>${seq.Label} position:${start_x + 1}-${end_x + 1}`);
    split_data.push(seq.Sequence.slice(start_x, end_x));
  }
  const data = split_data.join("\n");

  //Do modal and link our data
  const modal_object = DoModal(GetTemplateNameFromID(event));
  const link = ElementByID(
    "MAFFTMSAViewer_menu_file_export_fasta_link"
  ) as HTMLAnchorElement;
  link.href = data_uri_header + data;

  return;
}
