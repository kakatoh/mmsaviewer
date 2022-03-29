import { PositionBoxButton, SetWheelMode } from "../src/ui";
import { ElementByID } from "../src/utils";
import MenuFileOpenFile from "./menu_file_open_file";
import MenuFileOpenURL from "./menu_file_open_url";
import MenuHelpAbout from "./menu_help_about";
import MenuSettingsInterfaceColors from "./menu_settings_interface_colors";
import MenuSettingsMSAColors from "./menu_settings_msa_colors";
import MenuShareFASTA from "./menu_share_fasta";
import MenuSharePNG from "./menu_share_png";
import MenuShareURL from "./menu_share_url";

export default function (): void {
  //File menu items
  ElementByID("MAFFTMSAViewer_menu_file_open_url").onclick = MenuFileOpenURL;
  ElementByID("MAFFTMSAViewer_menu_file_open_file").onclick = MenuFileOpenFile;

  //Export menu items
  ElementByID("MAFFTMSAViewer_menu_share_url").onclick = MenuShareURL;
  ElementByID("MAFFTMSAViewer_menu_share_png").onclick = MenuSharePNG;
  ElementByID("MAFFTMSAViewer_menu_share_fasta").onclick = MenuShareFASTA;

  //Settings menu items
  ElementByID("MAFFTMSAViewer_menu_settings_interface_colors").onclick =
    MenuSettingsInterfaceColors;
  ElementByID("MAFFTMSAViewer_menu_settings_msa_colors").onclick =
    MenuSettingsMSAColors;

  //Help menu items
  ElementByID("MAFFTMSAViewer_menu_help_about").onclick = MenuHelpAbout;

  //Toolbar fields/buttons
  ElementByID("MAFFTMSAViewer_toolbar_position_input_button").onclick =
    PositionBoxButton;
  ElementByID("MAFFTMSAViewer_toolbar_wheelmode_omni").onclick = SetWheelMode;
  ElementByID("MAFFTMSAViewer_toolbar_wheelmode_zoom").onclick = SetWheelMode;
  ElementByID("MAFFTMSAViewer_toolbar_wheelmode_horizontal").onclick =
    SetWheelMode;
  ElementByID("MAFFTMSAViewer_toolbar_wheelmode_vertical").onclick =
    SetWheelMode;

  return;
}
