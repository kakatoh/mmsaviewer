import { FatalError } from "./ui";
import { NewError } from "./utils";

interface Tile {
  Index: number;
  StartX: number;
  StartY: number;
  EndX: number; //INCLUSIVE! Add TileWidth to StartX for slices!
  EndY: number; //INCLUSIVE! Add TileHeight to StartY for slices!
}

export class TileMap {
  public TotalWidth: number;
  public TotalHeight: number;
  public TileWidth: number;
  public TileHeight: number;
  public Stride: number; //Number of tiles per tile row, used for indexing
  public Tiles: Tile[];

  constructor(
    width: number,
    height: number,
    tile_width: number,
    tile_height: number,
    loading_modal: bootstrap.Modal
  ) {
    if (width % tile_width != 0) {
      loading_modal.hide();
      FatalError(
        NewError("Tile Error", "Global width is not a multiple of tile width.")
      );
    }
    if (height % tile_height != 0) {
      loading_modal.hide();
      FatalError(
        NewError(
          "Tile Error",
          "Global height is not a multiple of tile height."
        )
      );
    }

    this.TotalWidth = width;
    this.TotalHeight = height;
    this.TileWidth = tile_width;
    this.TileHeight = tile_height;
    this.Stride = this.TotalWidth / this.TileWidth;

    this.Tiles = [];
    var index = 0;
    for (var y = 0; y < this.TotalHeight; y += this.TileHeight) {
      for (var x = 0; x < this.TotalWidth; x += this.TileWidth) {
        var tile: Tile = {
          Index: index,
          StartX: x,
          StartY: y,
          EndX: x + this.TileWidth - 1,
          EndY: y + this.TileHeight - 1,
        };
        this.Tiles.push(tile);
        index += 1;
      }
    }
  }

  public GetTile(global_x: number, global_y: number): Tile {
    if (global_x >= this.TotalWidth) {
      console.log("Global X:", global_x);
      FatalError(NewError("Tile Error", "Global x too large to get tile."));
    }
    if (global_y >= this.TotalHeight) {
      console.log("Global Y:", global_y);
      FatalError(NewError("Tile Error", "Global y too large to get tile."));
    }

    const tile_index_y = Math.floor(global_y / this.TileHeight);
    const tile_index_x = Math.floor(global_x / this.TileWidth);
    const index = tile_index_y * this.Stride + tile_index_x;
    const tile = this.Tiles[index];

    if (global_x < tile.StartX || global_x > tile.EndX) {
      console.log("X:", global_x, "Y:", global_y);
      console.log("Tile:", tile);
      FatalError(NewError("Tile Error", "Wrong tile pulled."));
    }
    if (global_y < tile.StartY || global_y > tile.EndY) {
      console.log("X:", global_x, "Y:", global_y);
      console.log("Tile:", tile);
      FatalError(NewError("Tile Error", "Wrong tile pulled."));
    }

    return tile;
  }
}
