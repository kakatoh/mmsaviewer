import { ColorCollection } from "../src/colors";
import { CustomWindow } from "../src/types";
import {
  DoModal,
  FormatUIPercent,
  GetTemplateNameFromID,
  SetColorScheme,
} from "../src/ui";
import { ElementByID } from "../src/utils";

declare let window: CustomWindow;

export default function (event: MouseEvent): void {
  const state = window.MAFFTMSAViewer.State;
  const assets = window.MAFFTMSAViewer.Assets;
  const modal_object = DoModal(GetTemplateNameFromID(event));

  //Color scheme dropdown menu
  let scheme_selector_innerhtml = "";
  Object.keys(ColorCollection).forEach((key, _) => {
    if (assets.MSAColors.Name == key) {
      scheme_selector_innerhtml += `<option value="${key}" selected>${key}</option>\n`;
    } else {
      scheme_selector_innerhtml += `<option value="${key}">${key}</option>\n`;
    }
  });
  ElementByID("MAFFTMSAViewer_menu_settings_msa_colors_dropdown").innerHTML =
    scheme_selector_innerhtml;

  //Color by consensus dropdown menu
  const consensus_selector = ElementByID(
    "MAFFTMSAViewer_menu_settings_consensus_color_mode_dropdown"
  ) as HTMLSelectElement;
  if (state.ConsensusVaryBy) {
    consensus_selector.value = "vary_by_consensus";
  } else if (state.ConsensusColorBy) {
    consensus_selector.value = "color_by_consensus";
  } else {
    consensus_selector.value = "off";
  }

  //Consensus cutoff
  const consensus_cutoff = ElementByID(
    "MAFFTMSAViewer_menu_settings_msa_colors_color_by_consensus_cutoff"
  ) as HTMLInputElement;
  consensus_cutoff.value = `${FormatUIPercent(state.ConsensusCutoff, 2)}`;
  consensus_cutoff.onchange = async function () {
    var value = parseFloat(consensus_cutoff.value);
    if (value < 0) {
      value = 0;
    }
    if (value > 100) {
      value = 100;
    }
    consensus_cutoff.value = `${FormatUIPercent(value / 100, 2)}`;
  };

  //Apply consensus settings
  ElementByID("MAFFTMSAViewerApplyButton").onclick = async function () {
    //Apply consensus coloring mode options
    switch (consensus_selector.value) {
      case "vary_by_consensus":
        state.ConsensusColorBy = true;
        state.ConsensusVaryBy = true;
        break;
      case "color_by_consensus":
        state.ConsensusColorBy = true;
        state.ConsensusVaryBy = false;
        break;
      case "off":
        state.ConsensusColorBy = false;
        state.ConsensusVaryBy = false;
        break;
      default:
        console.log("Unhandled dropdown value:", consensus_selector.value);
    }

    //Apply cutoff
    state.ConsensusCutoff = parseFloat(consensus_cutoff.value) / 100.0;

    //Do color scheme last because it forces redrawing of window
    const scheme_selector = ElementByID(
      "MAFFTMSAViewer_menu_settings_msa_colors_dropdown"
    ) as HTMLSelectElement;
    SetColorScheme(scheme_selector.value);

    //Disconnect our onclick to avoid leaking the load button element
    ElementByID("MAFFTMSAViewerApplyButton").onclick = null;
    //Hide modal
    modal_object.hide();
  };

  return;
}
