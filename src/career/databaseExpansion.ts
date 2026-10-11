import { CareerPlayer } from './types';
import { calculatePlayerValue, calculateWeeklyWage } from './finance';
import { isHomegrownPlayer } from './squad';

export interface SupplementalPlayerDef {
  id: string;
  name: string;
  clubId: string;
  position: string;
  rating: number;
  age: number;
  potential: number;
  nationality: string;
}

export const SUPPLEMENTAL_PLAYERS_DATA: SupplementalPlayerDef[] = [
  // Man Blue
  { id: 'sup_mci_1', name: 'Stefan Ortega', clubId: 'man_blue', position: 'GK', rating: 80, age: 31, potential: 80, nationality: 'Germany' },
  { id: 'sup_mci_2', name: 'Rico Lewis', clubId: 'man_blue', position: 'RB', rating: 78, age: 19, potential: 88, nationality: 'England' },
  { id: 'sup_mci_3', name: 'Oscar Bobb', clubId: 'man_blue', position: 'RW', rating: 77, age: 21, potential: 87, nationality: 'Norway' },
  { id: 'sup_mci_4', name: 'James McAtee', clubId: 'man_blue', position: 'CAM', rating: 76, age: 21, potential: 85, nationality: 'England' },
  { id: 'sup_mci_5', name: 'Josh Wilson-Esbrand', clubId: 'man_blue', position: 'LB', rating: 72, age: 21, potential: 81, nationality: 'England' },

  // London Red
  { id: 'sup_ars_1', name: 'Jakub Kiwior', clubId: 'london_red', position: 'CB', rating: 79, age: 24, potential: 83, nationality: 'Poland' },
  { id: 'sup_ars_2', name: 'Ethan Nwaneri', clubId: 'london_red', position: 'CAM', rating: 75, age: 17, potential: 90, nationality: 'England' },
  { id: 'sup_ars_3', name: 'Myles Lewis-Skelly', clubId: 'london_red', position: 'LB', rating: 73, age: 17, potential: 88, nationality: 'England' },
  { id: 'sup_ars_4', name: 'Fabio Vieira', clubId: 'london_red', position: 'CM', rating: 78, age: 24, potential: 83, nationality: 'Portugal' },
  { id: 'sup_ars_5', name: 'Karl Hein', clubId: 'london_red', position: 'GK', rating: 72, age: 22, potential: 80, nationality: 'Estonia' },

  // Merseyside Red
  { id: 'sup_liv_1', name: 'Caoimhin Kelleher', clubId: 'merseyside_red', position: 'GK', rating: 81, age: 25, potential: 85, nationality: 'Republic of Ireland' },
  { id: 'sup_liv_2', name: 'Jarell Quansah', clubId: 'merseyside_red', position: 'CB', rating: 78, age: 21, potential: 87, nationality: 'England' },
  { id: 'sup_liv_3', name: 'Conor Bradley', clubId: 'merseyside_red', position: 'RB', rating: 78, age: 21, potential: 87, nationality: 'Northern Ireland' },
  { id: 'sup_liv_4', name: 'Stefan Bajcetic', clubId: 'merseyside_red', position: 'CDM', rating: 75, age: 19, potential: 86, nationality: 'Spain' },
  { id: 'sup_liv_5', name: 'Ben Doak', clubId: 'merseyside_red', position: 'RW', rating: 73, age: 18, potential: 86, nationality: 'Scotland' },

  // Man Red
  { id: 'sup_mun_1', name: 'Altay Bayindir', clubId: 'man_red', position: 'GK', rating: 77, age: 26, potential: 80, nationality: 'Turkey' },
  { id: 'sup_mun_2', name: 'Kobbie Mainoo', clubId: 'man_red', position: 'CM', rating: 80, age: 19, potential: 90, nationality: 'England' },
  { id: 'sup_mun_3', name: 'Willy Kambwala', clubId: 'man_red', position: 'CB', rating: 74, age: 19, potential: 83, nationality: 'France' },
  { id: 'sup_mun_4', name: 'Dan Gore', clubId: 'man_red', position: 'CM', rating: 70, age: 19, potential: 81, nationality: 'England' },
  { id: 'sup_mun_5', name: 'Toby Collyer', clubId: 'man_red', position: 'CDM', rating: 71, age: 20, potential: 82, nationality: 'England' },

  // London West
  { id: 'sup_che_1', name: 'Filip Jorgensen', clubId: 'london_west', position: 'GK', rating: 78, age: 22, potential: 84, nationality: 'Denmark' },
  { id: 'sup_che_2', name: 'Malo Gusto', clubId: 'london_west', position: 'RB', rating: 80, age: 21, potential: 87, nationality: 'France' },
  { id: 'sup_che_3', name: 'Romeo Lavia', clubId: 'london_west', position: 'CDM', rating: 78, age: 20, potential: 86, nationality: 'Belgium' },
  { id: 'sup_che_4', name: 'Cesare Casadei', clubId: 'london_west', position: 'CM', rating: 74, age: 21, potential: 83, nationality: 'Italy' },
  { id: 'sup_che_5', name: 'Tyrique George', clubId: 'london_west', position: 'LW', rating: 72, age: 18, potential: 85, nationality: 'England' },

  // North London White
  { id: 'sup_tot_1', name: 'Fraser Forster', clubId: 'north_london_white', position: 'GK', rating: 76, age: 36, potential: 76, nationality: 'England' },
  { id: 'sup_tot_2', name: 'Radu Dragusin', clubId: 'north_london_white', position: 'CB', rating: 78, age: 22, potential: 84, nationality: 'Romania' },
  { id: 'sup_tot_3', name: 'Archie Gray', clubId: 'north_london_white', position: 'CM', rating: 76, age: 18, potential: 88, nationality: 'England' },
  { id: 'sup_tot_4', name: 'Lucas Bergvall', clubId: 'north_london_white', position: 'CM', rating: 75, age: 18, potential: 88, nationality: 'Sweden' },
  { id: 'sup_tot_5', name: 'Mikey Moore', clubId: 'north_london_white', position: 'LW', rating: 73, age: 17, potential: 89, nationality: 'England' },

  // Tyneside Stripes
  { id: 'sup_new_1', name: 'Martin Dubravka', clubId: 'tyneside_stripes', position: 'GK', rating: 79, age: 35, potential: 79, nationality: 'Slovakia' },
  { id: 'sup_new_2', name: 'Lewis Hall', clubId: 'tyneside_stripes', position: 'LB', rating: 77, age: 19, potential: 86, nationality: 'England' },
  { id: 'sup_new_3', name: 'Tino Livramento', clubId: 'tyneside_stripes', position: 'RB', rating: 79, age: 21, potential: 86, nationality: 'England' },
  { id: 'sup_new_4', name: 'Lewis Miley', clubId: 'tyneside_stripes', position: 'CM', rating: 75, age: 18, potential: 87, nationality: 'England' },
  { id: 'sup_new_5', name: 'Alex Murphy', clubId: 'tyneside_stripes', position: 'CB', rating: 70, age: 20, potential: 80, nationality: 'Republic of Ireland' },

  // West Midlands Claret
  { id: 'sup_avl_1', name: 'Joe Gauci', clubId: 'west_midlands_claret', position: 'GK', rating: 73, age: 24, potential: 79, nationality: 'Australia' },
  { id: 'sup_avl_2', name: 'Kosta Nedeljkovic', clubId: 'west_midlands_claret', position: 'RB', rating: 74, age: 18, potential: 84, nationality: 'Serbia' },
  { id: 'sup_avl_3', name: 'Jhon Duran', clubId: 'west_midlands_claret', position: 'ST', rating: 79, age: 20, potential: 87, nationality: 'Colombia' },
  { id: 'sup_avl_4', name: 'Lamare Bogarde', clubId: 'west_midlands_claret', position: 'CDM', rating: 72, age: 20, potential: 81, nationality: 'Netherlands' },
  { id: 'sup_avl_5', name: 'Sil Swinkels', clubId: 'west_midlands_claret', position: 'CB', rating: 69, age: 20, potential: 78, nationality: 'Netherlands' },

  // Brighton Seagulls
  { id: 'sup_bha_1', name: 'Bart Verbruggen', clubId: 'brighton_seagulls', position: 'GK', rating: 79, age: 22, potential: 86, nationality: 'Netherlands' },
  { id: 'sup_bha_2', name: 'Jan Paul van Hecke', clubId: 'brighton_seagulls', position: 'CB', rating: 79, age: 24, potential: 84, nationality: 'Netherlands' },
  { id: 'sup_bha_3', name: 'Carlos Baleba', clubId: 'brighton_seagulls', position: 'CDM', rating: 77, age: 20, potential: 86, nationality: 'Cameroon' },
  { id: 'sup_bha_4', name: 'Jack Hinshelwood', clubId: 'brighton_seagulls', position: 'RB', rating: 75, age: 19, potential: 85, nationality: 'England' },
  { id: 'sup_bha_5', name: 'Evan Ferguson', clubId: 'brighton_seagulls', position: 'ST', rating: 78, age: 19, potential: 87, nationality: 'Republic of Ireland' },

  // West Ham Claret
  { id: 'sup_whu_1', name: 'Wes Foderingham', clubId: 'west_ham_claret', position: 'GK', rating: 74, age: 33, potential: 74, nationality: 'England' },
  { id: 'sup_whu_2', name: 'Max Kilman', clubId: 'west_ham_claret', position: 'CB', rating: 80, age: 27, potential: 82, nationality: 'England' },
  { id: 'sup_whu_3', name: 'Kaelan Casey', clubId: 'west_ham_claret', position: 'CB', rating: 69, age: 19, potential: 79, nationality: 'England' },
  { id: 'sup_whu_4', name: 'George Earthy', clubId: 'west_ham_claret', position: 'CAM', rating: 72, age: 19, potential: 83, nationality: 'England' },
  { id: 'sup_whu_5', name: 'Oliver Scarles', clubId: 'west_ham_claret', position: 'LB', rating: 69, age: 18, potential: 80, nationality: 'England' },

  // Wolves Gold
  { id: 'sup_wol_1', name: 'Dan Bentley', clubId: 'black_country_gold', position: 'GK', rating: 74, age: 31, potential: 74, nationality: 'England' },
  { id: 'sup_wol_2', name: 'Toti Gomes', clubId: 'black_country_gold', position: 'CB', rating: 78, age: 25, potential: 82, nationality: 'Portugal' },
  { id: 'sup_wol_3', name: 'Hugo Bueno', clubId: 'black_country_gold', position: 'LB', rating: 75, age: 21, potential: 82, nationality: 'Spain' },
  { id: 'sup_wol_4', name: 'Tommy Doyle', clubId: 'black_country_gold', position: 'CM', rating: 76, age: 22, potential: 82, nationality: 'England' },
  { id: 'sup_wol_5', name: 'Nathan Fraser', clubId: 'black_country_gold', position: 'ST', rating: 70, age: 19, potential: 80, nationality: 'Republic of Ireland' },

  // South London Eagles
  { id: 'sup_cry_1', name: 'Remi Matthews', clubId: 'south_london_eagles', position: 'GK', rating: 71, age: 30, potential: 71, nationality: 'England' },
  { id: 'sup_cry_2', name: 'Chris Richards', clubId: 'south_london_eagles', position: 'CB', rating: 77, age: 24, potential: 82, nationality: 'United States' },
  { id: 'sup_cry_3', name: 'David Ozoh', clubId: 'south_london_eagles', position: 'CDM', rating: 72, age: 19, potential: 83, nationality: 'England' },
  { id: 'sup_cry_4', name: 'Jesurun Rak-Sakyi', clubId: 'south_london_eagles', position: 'RW', rating: 74, age: 21, potential: 83, nationality: 'England' },
  { id: 'sup_cry_5', name: 'Matheus Franca', clubId: 'south_london_eagles', position: 'CAM', rating: 75, age: 20, potential: 85, nationality: 'Brazil' },

  // Bournemouth Cherries
  { id: 'sup_bou_1', name: 'Will Dennis', clubId: 'bournemouth_cherries', position: 'GK', rating: 71, age: 24, potential: 77, nationality: 'England' },
  { id: 'sup_bou_2', name: 'Illia Zabarnyi', clubId: 'bournemouth_cherries', position: 'CB', rating: 80, age: 22, potential: 86, nationality: 'Ukraine' },
  { id: 'sup_bou_3', name: 'Alex Scott', clubId: 'bournemouth_cherries', position: 'CM', rating: 77, age: 21, potential: 86, nationality: 'England' },
  { id: 'sup_bou_4', name: 'Milos Kerkez', clubId: 'bournemouth_cherries', position: 'LB', rating: 78, age: 20, potential: 86, nationality: 'Hungary' },
  { id: 'sup_bou_5', name: 'Daniel Jebbison', clubId: 'bournemouth_cherries', position: 'ST', rating: 72, age: 21, potential: 81, nationality: 'Canada' },

  // West London Whites
  { id: 'sup_ful_1', name: 'Steven Benda', clubId: 'west_london_whites', position: 'GK', rating: 73, age: 25, potential: 77, nationality: 'Germany' },
  { id: 'sup_ful_2', name: 'Jorge Cuenca', clubId: 'west_london_whites', position: 'CB', rating: 77, age: 24, potential: 81, nationality: 'Spain' },
  { id: 'sup_ful_3', name: 'Luke Harris', clubId: 'west_london_whites', position: 'CAM', rating: 71, age: 19, potential: 82, nationality: 'Wales' },
  { id: 'sup_ful_4', name: 'Martial Godo', clubId: 'west_london_whites', position: 'LW', rating: 70, age: 21, potential: 79, nationality: 'England' },
  { id: 'sup_ful_5', name: 'Jay Stansfield', clubId: 'west_london_whites', position: 'ST', rating: 74, age: 21, potential: 82, nationality: 'England' },

  // Merseyside Blue
  { id: 'sup_eve_1', name: 'Joao Virginia', clubId: 'merseyside_blue', position: 'GK', rating: 73, age: 24, potential: 78, nationality: 'Portugal' },
  { id: 'sup_eve_2', name: 'Jake O Brien', clubId: 'merseyside_blue', position: 'CB', rating: 77, age: 23, potential: 83, nationality: 'Republic of Ireland' },
  { id: 'sup_eve_3', name: 'Nathan Patterson', clubId: 'merseyside_blue', position: 'RB', rating: 76, age: 22, potential: 83, nationality: 'Scotland' },
  { id: 'sup_eve_4', name: 'Tim Iroegbunam', clubId: 'merseyside_blue', position: 'CM', rating: 74, age: 21, potential: 83, nationality: 'England' },
  { id: 'sup_eve_5', name: 'Youssef Chermiti', clubId: 'merseyside_blue', position: 'ST', rating: 73, age: 20, potential: 83, nationality: 'Portugal' },

  // West London Bees
  { id: 'sup_bre_1', name: 'Hakon Valdimarsson', clubId: 'west_london_bees', position: 'GK', rating: 74, age: 22, potential: 81, nationality: 'Iceland' },
  { id: 'sup_bre_2', name: 'Fin Stevens', clubId: 'west_london_bees', position: 'RB', rating: 71, age: 21, potential: 79, nationality: 'Wales' },
  { id: 'sup_bre_3', name: 'Yehor Yarmoliuk', clubId: 'west_london_bees', position: 'CM', rating: 74, age: 20, potential: 83, nationality: 'Ukraine' },
  { id: 'sup_bre_4', name: 'Ryan Trevitt', clubId: 'west_london_bees', position: 'CAM', rating: 70, age: 21, potential: 79, nationality: 'England' },
  { id: 'sup_bre_5', name: 'Michael Olakigbe', clubId: 'west_london_bees', position: 'RW', rating: 70, age: 20, potential: 80, nationality: 'England' },

  // Nottingham Forest Red
  { id: 'sup_nfo_1', name: 'Carlos Miguel', clubId: 'nottingham_forest_red', position: 'GK', rating: 76, age: 25, potential: 81, nationality: 'Brazil' },
  { id: 'sup_nfo_2', name: 'Murillo', clubId: 'nottingham_forest_red', position: 'CB', rating: 80, age: 22, potential: 87, nationality: 'Brazil' },
  { id: 'sup_nfo_3', name: 'Neco Williams', clubId: 'nottingham_forest_red', position: 'RB', rating: 77, age: 23, potential: 82, nationality: 'Wales' },
  { id: 'sup_nfo_4', name: 'Zach Abbott', clubId: 'nottingham_forest_red', position: 'CB', rating: 69, age: 18, potential: 81, nationality: 'England' },
  { id: 'sup_nfo_5', name: 'Joe Gardner', clubId: 'nottingham_forest_red', position: 'ST', rating: 68, age: 18, potential: 79, nationality: 'England' },

  // Leicester Foxes
  { id: 'sup_lei_1', name: 'Jakub Stolarczyk', clubId: 'leicester_foxes', position: 'GK', rating: 73, age: 23, potential: 80, nationality: 'Poland' },
  { id: 'sup_lei_2', name: 'Wout Faes', clubId: 'leicester_foxes', position: 'CB', rating: 78, age: 26, potential: 81, nationality: 'Belgium' },
  { id: 'sup_lei_3', name: 'Kasey McAteer', clubId: 'leicester_foxes', position: 'RW', rating: 74, age: 22, potential: 81, nationality: 'Republic of Ireland' },
  { id: 'sup_lei_4', name: 'Will Alves', clubId: 'leicester_foxes', position: 'CAM', rating: 70, age: 19, potential: 82, nationality: 'England' },
  { id: 'sup_lei_5', name: 'Tom Cannon', clubId: 'leicester_foxes', position: 'ST', rating: 73, age: 21, potential: 81, nationality: 'Republic of Ireland' },

  // South Coast Saints
  { id: 'sup_sou_1', name: 'Joe Lumley', clubId: 'south_coast_saints', position: 'GK', rating: 72, age: 29, potential: 72, nationality: 'England' },
  { id: 'sup_sou_2', name: 'Ronnie Edwards', clubId: 'south_coast_saints', position: 'CB', rating: 74, age: 21, potential: 83, nationality: 'England' },
  { id: 'sup_sou_3', name: 'Tyler Dibling', clubId: 'south_coast_saints', position: 'RW', rating: 74, age: 18, potential: 88, nationality: 'England' },
  { id: 'sup_sou_4', name: 'Sam Amo-Ameyaw', clubId: 'south_coast_saints', position: 'LW', rating: 72, age: 18, potential: 84, nationality: 'England' },
  { id: 'sup_sou_5', name: 'Sekou Mara', clubId: 'south_coast_saints', position: 'ST', rating: 74, age: 22, potential: 81, nationality: 'France' },

  // Suffolk Blue (Ipswich)
  { id: 'sup_ips_1', name: 'Christian Walton', clubId: 'suffolk_tractors', position: 'GK', rating: 74, age: 28, potential: 76, nationality: 'England' },
  { id: 'sup_ips_2', name: 'Leif Davis', clubId: 'suffolk_tractors', position: 'LB', rating: 77, age: 24, potential: 83, nationality: 'England' },
  { id: 'sup_ips_3', name: 'Cameron Humphreys', clubId: 'suffolk_tractors', position: 'CM', rating: 71, age: 20, potential: 81, nationality: 'England' },
  { id: 'sup_ips_4', name: 'Finlay Barbrook', clubId: 'suffolk_tractors', position: 'CDM', rating: 68, age: 19, potential: 78, nationality: 'England' },
  { id: 'sup_ips_5', name: 'Gerard Buabo', clubId: 'suffolk_tractors', position: 'ST', rating: 68, age: 18, potential: 79, nationality: 'England' },
];

/**
 * Converts supplemental player definitions into standard CareerPlayer objects.
 */
export function convertToCareerPlayer(def: SupplementalPlayerDef): CareerPlayer {
  const value = calculatePlayerValue(def.rating, def.age, def.position);
  const wageWeekly = calculateWeeklyWage(def.rating, value);
  const isHomegrown = isHomegrownPlayer({ nationality: def.nationality });

  return {
    id: def.id,
    cardId: `${def.id}_card`,
    name: def.name,
    rating: def.rating,
    position: def.position,
    age: def.age,
    value,
    wageWeekly,
    contractYears: 3,
    fitness: 100,
    morale: 85,
    form: 7.0,
    injured: false,
    isHomegrown,
    club: def.clubId,
    nationality: def.nationality,
    potential: def.potential,
  };
}

export function getSupplementalPlayersForClub(clubId: string): CareerPlayer[] {
  return SUPPLEMENTAL_PLAYERS_DATA.filter((p) => p.clubId === clubId).map(convertToCareerPlayer);
}

export function getAllSupplementalPlayers(): CareerPlayer[] {
  return SUPPLEMENTAL_PLAYERS_DATA.map(convertToCareerPlayer);
}
