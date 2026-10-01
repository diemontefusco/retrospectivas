export function bindVotingBindings(ctx) {
  const {
    MAX_VOTES_PER_PARTICIPANT,
    state,
    castVote,
    recoverVote,
    render,
    loadVotes,
    broadcastVoteUpdate
  } = ctx;

    // VOTACIÓN
    // ===================================================
  
    document
      .querySelectorAll(".recover-vote")
      .forEach(button => {
  
        button.onclick = async () => {
  
          const topicKey =
            button.dataset.recoverTopic;
  
          if (!state.participantId) {
            alert(
              "No se pudo identificar tu participación en la retro."
            );
            return;
          }
  
          if (!(state.myVotes[topicKey] > 0)) {
            return;
          }
  
          button.disabled = true;
          const originalText = button.textContent;
          button.textContent = "Recuperando…";
  
          try {
            const {
              data,
              error
            } = await recoverVote({
              retroId: state.retroId,
              participantId: state.participantId,
              topicKey
            });
  
            if (error) {
              throw error;
            }
  
            if (!data?.success) {
              throw new Error(
                data?.message ||
                "No se pudo recuperar el voto."
              );
            }
  
            state.myVotes[topicKey] = Math.max(
              0,
              (state.myVotes[topicKey] || 0) - 1
            );
  
            state.usedVotes = Math.max(
              0,
              state.usedVotes - 1
            );
  
            if (data.topic_key && data.topic_votes !== undefined) {
              if (data.topic_votes > 0) {
                state.votes[data.topic_key] = data.topic_votes;
              } else {
                delete state.votes[data.topic_key];
              }
            } else {
              await loadVotes();
            }

            await broadcastVoteUpdate({
              topicKey,
              topicVotes: state.votes[topicKey] || 0
            });

            render();
          } catch (error) {
            console.error(
              "Error recuperando voto:",
              error
            );
            alert(
              "No se pudo recuperar el voto.\n\n" +
              error.message
            );
            button.disabled = false;
            button.textContent = originalText;
          }
        };
      });
  
    document
      .querySelectorAll(".vote")
      .forEach(button => {
  
        button.onclick = async () => {
  
          const topicKey =
            button.dataset.topic;
  
  
          if (!state.participantId) {
  
            alert(
              "No se pudo identificar tu participación en la retro."
            );
  
            return;
          }
  
  
          if (
            state.usedVotes >=
            MAX_VOTES_PER_PARTICIPANT
          ) {
  
            alert(
              "Ya utilizaste tus 3 votos."
            );
  
            return;
          }
  
  
          button.disabled = true;
  
  
          // ---------------------------------------------
          // REGISTRAR VOTO DEL PARTICIPANTE
          // ---------------------------------------------
  
          const {
            data,
            error
          } = await castVote({
            retroId: state.retroId,
            participantId: state.participantId,
            topicKey
          });
  
  
          if (error) {
  
            console.error(
              "Error guardando voto:",
              error
            );
  
            alert(
              "No se pudo registrar el voto.\n\n" +
              error.message
            );
  
            button.disabled = false;
  
            return;
          }
  
  
          console.log(
            "Voto guardado:",
            data
          );
  
  
          // ---------------------------------------------
          // ACTUALIZAR VOTOS DEL PARTICIPANTE
          // ---------------------------------------------
  
          state.myVotes[topicKey] =
            (state.myVotes[topicKey] || 0) + 1;
  
          state.usedVotes =
            state.usedVotes + 1;
  
  
          // ---------------------------------------------
          // ACTUALIZAR TOTAL GLOBAL
          // ---------------------------------------------
  
          if (
            data &&
            data.topic_key &&
            data.votos !== undefined
          ) {
  
            state.votes[data.topic_key] =
              data.votos;
  
          } else {
  
            // El RPC actual devuelve JSON con
            // used_votes / remaining_votes.
            // El realtime de votos actualizará
            // el total global.
  
            await loadVotes();
  
          }
  
  
          render();
  
        };
  
      });
  
  
    // ===================================================
}
