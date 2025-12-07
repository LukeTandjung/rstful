import * as React from "react";
import { Link } from "react-router";
import { Tabs } from "@base-ui-components/react/tabs";
import { Separator } from "@base-ui-components/react/separator";
import { ArrowUturnLeftIcon } from "@heroicons/react/16/solid";
import { ColorWheelIcon } from "@radix-ui/react-icons";
import { CustomSelect, SectionCard } from "components";
import { base16Palettes } from "data/base16Palettes";
import { tabOptions, paletteTypeOptions } from "data/selectOptions";
import type { FormState, Base16Colors, ThreeTenColors } from "types/styles";

export default function Styles() {
  const [activeTab, setActiveTab] = React.useState("theme");
  const [formState, setFormState] = React.useState<FormState>({
    palette_type: "Select type",
    palette: {
      colors: {
        accent: "",
        gray: "",
        background: "",
      },
    },
  });

  const base16Options = base16Palettes.map((palette) => ({
    value: palette.name,
    label: palette.name,
  }));

  const isBase16 = (
    colors: ThreeTenColors | Base16Colors,
  ): colors is Base16Colors => {
    return "base1" in colors;
  };

  const selectedBase16Palette =
    formState.palette_type === "base16" && formState.palette.name
      ? base16Palettes.find((p) => p.name === formState.palette.name)
      : null;

  return (
    <div className="bg-background flex flex-col size-full">
      {/* Banner */}
      <div className="h-[100px] sm:h-[140px] md:h-[180px] lg:h-[260px] xl:h-[300px] relative shrink-0 w-full">
        <img
          src="/assets/banner.png"
          alt="Banner"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      </div>

      {/* Body */}
      <div className="flex flex-col gap-6 grow min-h-0 overflow-clip p-6 relative shrink-0 w-full">
        {/* TabBar */}
        <div className="flex items-center justify-between w-full">
          <Link
            to="/"
            className="bg-background-select flex gap-3.5 items-center px-3 py-2 rounded-lg font-medium text-lg leading-7 text-text"
          >
            <ArrowUturnLeftIcon className="size-6" />
            Back
          </Link>

          <Tabs.Root
            value={activeTab}
            onValueChange={(value) => setActiveTab(value)}
          >
            <Tabs.List className="flex gap-6 h-full items-center justify-end px-2.5 py-2">
              {tabOptions.map((tab) => (
                <Tabs.Tab
                  key={tab.value}
                  value={tab.value}
                  className="flex gap-2.5 items-center px-3 py-2 rounded-lg cursor-pointer data-active:bg-background-select data-active:text-border-focus text-text font-medium text-lg leading-7"
                >
                  {tab.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.Root>
        </div>

        {/* Separator */}
        <Separator className="w-full bg-border-unfocus h-0.5" />

        {/* Style Configuration */}
        <Tabs.Root
          value={activeTab}
          onValueChange={(value) => setActiveTab(value)}
          className="flex flex-col grow min-h-0 w-full"
        >
          <Tabs.Panel
            value="theme"
            className="flex flex-col grow min-h-0 w-full"
          >
            {/* Color Theme */}
            <SectionCard
              icon={<ColorWheelIcon className="size-7" />}
              title="Colour Theme"
              description="Choose the colour theme of your MCP frontend."
            >
              <div className="flex flex-col gap-6 w-full">
                {/* Palette Settings */}
                <CustomSelect
                  value={formState.palette_type}
                  onValueChange={(value) =>
                    setFormState({
                      palette_type: value,
                      palette:
                        value === "base16"
                          ? {
                              name: base16Palettes[0].name,
                              description: base16Palettes[0].description,
                              colors: base16Palettes[0].colors,
                            }
                          : {
                              colors: {
                                accent: "",
                                gray: "",
                                background: "",
                              },
                            },
                    })
                  }
                  options={paletteTypeOptions}
                  placeholder="Select type"
                />
                {/*Guideline Comments*/}
                {/* 60-30-10 Palette */}
                {formState.palette_type === "60-30-10" &&
                  !isBase16(formState.palette.colors) && (
                    <React.Fragment>
                      <div className="flex p-3 items-start self-stretch border-l border-l-border-unfocus borderfont-light text-base text-text-alt ">
                        A theme preview is unavailable as LLM outputs are
                        non-deterministic. In general,
                        <ul>
                          <li>
                            The background colour maps to containers and page
                            backgrounds.
                          </li>
                          <li>
                            The gray colour maps to card backgrounds, secondary
                            text, borders, dividers, and input fields.
                          </li>
                          <li>
                            The accent colour maps to primary buttons, badges,
                            active states, and icons.
                          </li>
                        </ul>
                      </div>
                      <div className="grid grid-cols-3 gap-1 w-full">
                        <div className="flex flex-col gap-1">
                          <div className="font-normal text-base leading-7 text-text">
                            Accent
                          </div>
                          <input
                            type="color"
                            value={formState.palette.colors.accent}
                            onChange={(e) =>
                              setFormState({
                                ...formState,
                                palette: {
                                  ...formState.palette,
                                  colors: {
                                    ...(formState.palette
                                      .colors as ThreeTenColors),
                                    accent: e.target.value,
                                  },
                                },
                              })
                            }
                            className="w-full h-16 rounded-md cursor-pointer"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="font-normal text-base leading-7 text-text">
                            Gray
                          </div>
                          <input
                            type="color"
                            value={formState.palette.colors.gray}
                            onChange={(e) =>
                              setFormState({
                                ...formState,
                                palette: {
                                  ...formState.palette,
                                  colors: {
                                    ...(formState.palette
                                      .colors as ThreeTenColors),
                                    gray: e.target.value,
                                  },
                                },
                              })
                            }
                            className="w-full h-16 rounded-md cursor-pointer"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="font-normal text-base leading-7 text-text">
                            Background
                          </div>
                          <input
                            type="color"
                            value={formState.palette.colors.background}
                            onChange={(e) =>
                              setFormState({
                                ...formState,
                                palette: {
                                  ...formState.palette,
                                  colors: {
                                    ...(formState.palette
                                      .colors as ThreeTenColors),
                                    background: e.target.value,
                                  },
                                },
                              })
                            }
                            className="w-full h-16 rounded-md cursor-pointer"
                          />
                        </div>
                      </div>
                    </React.Fragment>
                  )}

                {/* base16 Palette */}
                {formState.palette_type === "base16" && (
                  <div className="flex flex-col gap-6 w-full">
                    <div className="flex flex-col gap-2.5 w-full">
                      <div className="font-normal text-base leading-7 text-text">
                        Preset Palette
                      </div>
                      <CustomSelect
                        value={formState.palette.name || base16Palettes[0].name}
                        onValueChange={(value) => {
                          const palette = base16Palettes.find(
                            (p) => p.name === value,
                          );
                          if (palette) {
                            setFormState({
                              ...formState,
                              palette: {
                                name: palette.name,
                                description: palette.description,
                                colors: palette.colors,
                              },
                            });
                          }
                        }}
                        options={base16Options}
                        placeholder="Select palette"
                      />
                    </div>

                    {selectedBase16Palette && (
                      <div className="flex flex-col gap-3.5 w-full">
                        <div className="font-light text-base leading-7 text-text-alt">
                          {selectedBase16Palette.description}
                        </div>

                        <div className="grid grid-cols-4 gap-3.5 w-full">
                          {Object.entries(selectedBase16Palette.colors).map(
                            ([key, color]) => (
                              <div
                                key={key}
                                className="flex flex-col gap-2.5 items-center"
                              >
                                <div
                                  className="w-full aspect-square rounded-md"
                                  style={{ backgroundColor: color }}
                                />
                                <div className="font-normal text-base leading-7 text-text-alt">
                                  {key}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SectionCard>
          </Tabs.Panel>

          <Tabs.Panel
            value="images"
            className="flex flex-col grow min-h-0 w-full"
          >
            <div className="bg-background-alt flex flex-col items-start p-6 rounded-md w-full font-normal text-base leading-7 text-text-alt">
              Images configuration coming soon...
            </div>
          </Tabs.Panel>

          <Tabs.Panel
            value="fonts"
            className="flex flex-col grow min-h-0 w-full"
          >
            <div className="bg-background-alt flex flex-col items-start p-6 rounded-md w-full font-normal text-base leading-7 text-text-alt">
              Fonts configuration coming soon...
            </div>
          </Tabs.Panel>
        </Tabs.Root>
      </div>
    </div>
  );
}
