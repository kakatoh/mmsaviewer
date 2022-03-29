import { CustomWindow } from "../src/types";
import { DoModal, GetTemplateNameFromID, RecoverableError } from "../src/ui";
import { ElementByID, NewError } from "../src/utils";

declare let window: CustomWindow;

export default function (event: MouseEvent): void {
  //Initialize
  const state = window.MAFFTMSAViewer.State;
  const assets = window.MAFFTMSAViewer.Assets;
  if (!state.Initialized) {
    RecoverableError(NewError("Error", "Aligment has not yet been loaded."));
    return;
  }

  const position_box = ElementByID(
    "MAFFTMSAViewer_toolbar_position_input"
  ) as HTMLInputElement;

  const url = new URL(window.location.href);
  url.searchParams.set("Pos", position_box.value);
  url.searchParams.set("ColorScheme", assets.MSAColors.Name);

  //Do modal and link our data
  const modal_object = DoModal(GetTemplateNameFromID(event));
  const link_box = ElementByID(
    "MAFFTMSAViewer_menu_file_export_link_input_box"
  ) as HTMLInputElement;
  const link_string = decodeURIComponent(url.href);
  link_box.value = link_string;
  link_box.select();
  link_box.selectionDirection = "forward";
  link_box.selectionStart = 0;
  link_box.selectionEnd = link_string.length;

  return;
}
