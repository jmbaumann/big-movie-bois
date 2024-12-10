import { HelpCircle } from "lucide-react";

import { STUDIO_SLOT_TYPES } from "@repo/api/src/enums";

import ResponsiveDialog from "./ResponsiveDialog";

export default function SlotDescriptionDialog({ className, size }: { className?: string; size?: number }) {
  return (
    <ResponsiveDialog>
      <ResponsiveDialog.Trigger className={className}>
        <HelpCircle size={size ?? 24} />
      </ResponsiveDialog.Trigger>

      <ResponsiveDialog.Content>
        <ResponsiveDialog.Header>
          <ResponsiveDialog.Title>Slot Descriptions</ResponsiveDialog.Title>

          <>
            The slot that you put your film in will determine how that film will be scored.
            <table className="mt-2 w-full text-left text-sm text-gray-500 rtl:text-right">
              <thead className="bg-primary text-xs uppercase text-white">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    Slot
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Scoring
                  </th>
                </tr>
              </thead>
              <tbody className="text-white">
                <tr className="border-b">
                  <th className="px-2">{STUDIO_SLOT_TYPES.OPENING_WEEKEND_BOX_OFFICE}</th>
                  <td className="px-6 py-4">
                    The total amount of money made at the domestic (US) box office in its opening weekend
                  </td>
                  <td className="px-6 py-4">[OPENING WEEKEND BOX OFFICE] / $1 million</td>
                </tr>
                <tr className="border-b">
                  <th className="px-2">{STUDIO_SLOT_TYPES.TOTAL_BOX_OFFICE}</th>
                  <td className="px-6 py-4">
                    The total amount of money made at the box office until the day your session ends
                  </td>
                  <td className="px-6 py-4">[TOTAL BOX OFFICE] / $10 million</td>
                </tr>
                <tr className="border-b">
                  <th className="px-2">{STUDIO_SLOT_TYPES.TMDB_RATING}</th>
                  <td className="px-6 py-4">The film's score on TMDB on the day your session ends</td>
                  <td className="px-6 py-4">[TMDB%]</td>
                </tr>
                <tr className="">
                  <th className="px-2">{STUDIO_SLOT_TYPES.REVERSE_TMDB_RATING}</th>
                  <td className="px-6 py-4">The inverse of the film's score on TMDB on the day your session ends</td>
                  <td className="px-6 py-4">100 - [TMDB%]</td>
                </tr>
                {/* <tr className="border-b">
                  <th className="px-2">{STUDIO_SLOT_TYPES.IMDB_RATING}</th>
                  <td className="px-6 py-4">The film's score on IMDb on the day your session ends</td>
                  <td className="px-6 py-4">[IMDB SCORE] x 10</td>
                </tr>
                <tr className="border-b">
                  <th className="px-2">{STUDIO_SLOT_TYPES.REVERSE_IMDB_RATING}</th>
                  <td className="px-6 py-4">The inverse of the film's score on IMDb on the day your session ends</td>
                  <td className="px-6 py-4">(10 - [IMDB SCORE]) x 10</td>
                </tr>
                <tr className="border-b">
                  <th className="px-2">{STUDIO_SLOT_TYPES.RT_TOMATOMETER}</th>
                  <td className="px-6 py-4">
                    The film's Tomatometer (critic) score on Rotten Tomatoes on the day your session ends
                  </td>
                  <td className="px-6 py-4">% = score</td>
                </tr>
                <tr className="border-b">
                  <th className="px-2">{STUDIO_SLOT_TYPES.RT_POPCORNMETER}</th>
                  <td className="px-6 py-4">
                    The film's Popcornmeter (audience) score on Rotten Tomatoes on the day your session ends
                  </td>
                  <td className="px-6 py-4">% = score</td>
                </tr>
                <tr className="border-b">
                  <th className="px-2">{STUDIO_SLOT_TYPES.REVERSE_RT_TOMATOMETER}</th>
                  <td className="px-6 py-4">
                    The inverse of the film's Tomatometer (critic) score on Rotten Tomatoes on the day your session ends
                  </td>
                  <td className="px-6 py-4">100 - %</td>
                </tr>
                <tr className="border-b">
                  <th className="px-2">{STUDIO_SLOT_TYPES.REVERSE_RT_POPCORNMETER}</th>
                  <td className="px-6 py-4">
                    The inverse of the film's Popcornmeter (audience) score on Rotten Tomatoes on the day your session
                    ends
                  </td>
                  <td className="px-6 py-4">100 - %</td>
                </tr>
                <tr className="border-b">
                  <th className="px-2">{STUDIO_SLOT_TYPES.RT_DISPARITY}</th>
                  <td className="px-6 py-4">
                    The difference between the film's Tomatometer (critic) score & its Popcornmeter (audience) score on
                    Rotten Tomatoes on the day your session ends
                  </td>
                  <td className="px-6 py-4">| [TOMATOMETER] - [POPCORNMETER] |</td>
                </tr>
                <tr className="border-b">
                  <th className="px-2">{STUDIO_SLOT_TYPES.LETTERBOXD_RATING}</th>
                  <td className="px-6 py-4">The film's star rating on Letterboxd on the day your session ends</td>
                  <td className="px-6 py-4">[LETTERBOXD RATING] x 20</td>
                </tr>
                <tr className="border-b">
                  <th className="px-2">{STUDIO_SLOT_TYPES.REVERSE_LETTERBOXD_RATING}</th>
                  <td className="px-6 py-4">
                    The inverse of the film's star rating on Letterboxd on the day your session ends
                  </td>
                  <td className="px-6 py-4">(5 - [LETTERBOXD RATING]) x 20</td>
                </tr>
                <tr className="border-b">
                  <th className="px-2">{STUDIO_SLOT_TYPES.LETTERBOXD_NUM_WATCHED}</th>
                  <td className="px-6 py-4">
                    The number of people who have marked the film as "Watched" on Letterboxd
                  </td>
                  <td className="px-6 py-4">[# WATCHED] / 10 thousand</td>
                </tr> */}
              </tbody>
            </table>
          </>
        </ResponsiveDialog.Header>
      </ResponsiveDialog.Content>
    </ResponsiveDialog>
  );
}
