/**
 * Détermine si le mode maintenance est actif en ce moment, que ce soit
 * activé manuellement (immédiat) ou programmé (créneau start → end).
 */
function getMaintenanceStatus(maintenance){
  const m = maintenance || { active:false, scheduledStart:null, scheduledEnd:null, message:"" };
  const now = Date.now();

  // Fermeture manuelle ("maintenant") : active tant que la date de fin
  // (si une durée a été donnée) n'est pas dépassée.
  if(m.active){
    if(m.scheduledEnd && now > m.scheduledEnd){
      return { isActive:false, message:"", endsAt:null, mode:null, expired:true };
    }
    return { isActive:true, message: m.message || "", endsAt: m.scheduledEnd || null, mode:"manuel" };
  }

  // Fermeture programmée : active uniquement pendant le créneau [start, end].
  if(m.scheduledStart && m.scheduledEnd && now >= m.scheduledStart && now <= m.scheduledEnd){
    return { isActive:true, message: m.message || "", endsAt: m.scheduledEnd, mode:"programme" };
  }

  return { isActive:false, message:"", endsAt:null, mode:null };
}

module.exports = { getMaintenanceStatus };
