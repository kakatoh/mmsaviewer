import { CustomWindow } from "../src/types";
import { DoModal, GetTemplateNameFromID, LoadAlignment } from "../src/ui";
import { ElementByID, SetHTMLByID } from "../src/utils";

declare let window: CustomWindow;

export default function (event: MouseEvent): void {
  const modal_object = DoModal(GetTemplateNameFromID(event));
  ElementByID("MAFFTMSAViewerLoadButton").onclick = async function () {
    //Grab file object from user input before we destroy the modal
    const input_box = ElementByID(
      "MAFFTMSAViewerFileInputBox"
    ) as HTMLInputElement;
    const file = input_box.files[0];
    //Disconnect our onclick to avoid leaking the load button element
    ElementByID("MAFFTMSAViewerLoadButton").onclick = null;
    //Hide modal
    modal_object.hide();
    //Pop the loading screen
    const loading_modal = DoModal("loading_screen_modal");
    //Load data
    const file_reader = new FileReader();
    file_reader.onload = async function () {
      const raw_data = new Uint8Array(file_reader.result as ArrayBuffer);
      await LoadAlignment(file.name, raw_data, loading_modal);
    };
    file_reader.onprogress = async function (event: ProgressEvent) {
      const percentage = Math.floor((event.loaded / event.total) * 100.0);
      SetHTMLByID(
        "MAFFTMSAViewerLoadingText",
        "Loading data (" + percentage + "%)..."
      );
    };
    file_reader.readAsArrayBuffer(file);
  };

  return;
}
